/*
# Security Hardening, Column-Level RLS Grants & Anti-Tamper Enforcement
# Migration: 20261105230000_hardened_rls_and_security_perfection.sql

## Summary:
1. Profiles Column-Level Permissions:
   - Revokes general UPDATE on public.profiles from authenticated users.
   - Grants UPDATE solely on the columns written by the client application:
     (display_name, avatar_data, preferences, updated_at).
   - Prevents authenticated users from modifying is_admin, email, id, or created_at.

2. Multiplayer / Game Invitations State Protection:
   - Adds a BEFORE UPDATE trigger on invitations to prevent modifying immutable columns
     (id, from_email, from_name, to_email, game_id, match_id, created_at, expires_at).
   - Only status (and updated_at, if present) may be updated.
   - Rejects accepting an invitation whose expires_at has passed (compared against OLD.expires_at).

3. Append-Only Game Records:
   - Drops delete_own_game_records policy from public.game_records and revokes DELETE from authenticated/anon.
   - Enforces strict append-only match history.

4. Allowed Emails Privacy:
   - Drops anon SELECT policy from public.allowed_emails and revokes all anon access.
   - Restricts SELECT strictly to authenticated users and service_role.

5. Auth Email Allowlist Trigger Hardening:
   - Recreates the allowlist trigger on auth.users as BEFORE INSERT OR UPDATE OF email.
   - Configures SET search_path = '' and uses fully qualified table and function names.
   - Ensures profile creation occurs reliably on AFTER INSERT.
*/

-- ============================================================================
-- 1. PROFILES: RESTRICT UPDATE TO WRITABLE COLUMNS ONLY (NO is_admin / email)
-- ============================================================================

-- Revoke blanket UPDATE permission from authenticated users
REVOKE UPDATE ON public.profiles FROM authenticated;

-- Grant UPDATE solely on columns written by the client (avatarStorage, gameRecordsService)
GRANT UPDATE (display_name, avatar_data, preferences, updated_at) ON public.profiles TO authenticated;

-- Ensure RLS update policy remains strictly scoped to owner
DROP POLICY IF EXISTS "update_own_profile" ON public.profiles;
CREATE POLICY "update_own_profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ============================================================================
-- 2. GAME / MULTIPLAYER INVITATIONS: BEFORE UPDATE TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION public.protect_invitation_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Prevent modification of immutable invitation metadata
  IF NEW.id IS DISTINCT FROM OLD.id OR
     NEW.from_email IS DISTINCT FROM OLD.from_email OR
     NEW.from_name IS DISTINCT FROM OLD.from_name OR
     NEW.to_email IS DISTINCT FROM OLD.to_email OR
     NEW.game_id IS DISTINCT FROM OLD.game_id OR
     NEW.match_id IS DISTINCT FROM OLD.match_id OR
     NEW.created_at IS DISTINCT FROM OLD.created_at OR
     NEW.expires_at IS DISTINCT FROM OLD.expires_at THEN
    RAISE EXCEPTION 'Only status (and updated_at if present) may be updated on invitations';
  END IF;

  -- Reject accepting an invitation whose expiration has already passed
  IF NEW.status = 'accepted' AND OLD.expires_at < pg_catalog.clock_timestamp() THEN
    RAISE EXCEPTION 'Cannot accept an invitation whose expires_at has passed';
  END IF;

  RETURN NEW;
END;
$$;

-- Attach trigger to multiplayer_invitations
DROP TRIGGER IF EXISTS trg_protect_multiplayer_invitations_update ON public.multiplayer_invitations;
CREATE TRIGGER trg_protect_multiplayer_invitations_update
  BEFORE UPDATE ON public.multiplayer_invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_invitation_update();

-- If game_invitations table exists, attach trigger as well
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'game_invitations'
  ) THEN
    DROP TRIGGER IF EXISTS trg_protect_game_invitations_update ON public.game_invitations;
    CREATE TRIGGER trg_protect_game_invitations_update
      BEFORE UPDATE ON public.game_invitations
      FOR EACH ROW
      EXECUTE FUNCTION public.protect_invitation_update();
  END IF;
END $$;

-- ============================================================================
-- 3. GAME RECORDS: APPEND-ONLY (DROP DELETE POLICIES & REVOKE DELETE)
-- ============================================================================

DROP POLICY IF EXISTS "delete_own_game_records" ON public.game_records;
REVOKE DELETE ON public.game_records FROM authenticated, anon;

-- ============================================================================
-- 4. ALLOWED EMAILS: DROP ANON SELECT POLICY AND REVOKE ANON ACCESS
-- ============================================================================

DROP POLICY IF EXISTS "read_allowed_emails" ON public.allowed_emails;
DROP POLICY IF EXISTS "authenticated_read_allowed_emails" ON public.allowed_emails;

CREATE POLICY "authenticated_read_allowed_emails"
  ON public.allowed_emails FOR SELECT
  TO authenticated
  USING (true);

REVOKE ALL ON public.allowed_emails FROM anon;

-- ============================================================================
-- 5. AUTH.USERS ALLOWLIST TRIGGER: BEFORE INSERT OR UPDATE OF email
-- ============================================================================

-- Function to validate email allowlist with empty search_path and fully-qualified names
CREATE OR REPLACE FUNCTION public.enforce_email_allowlist()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.allowed_emails
    WHERE email = pg_catalog.lower(NEW.email)
  ) THEN
    RAISE EXCEPTION 'This email is not authorized to use HAYA Games.';
  END IF;

  RETURN NEW;
END;
$$;

-- Drop previous triggers if existing
DROP TRIGGER IF EXISTS trg_enforce_email_allowlist ON auth.users;
DROP TRIGGER IF EXISTS trg_enforce_email_allowlist_before ON auth.users;

-- Recreate trigger as BEFORE INSERT OR UPDATE OF email
CREATE TRIGGER trg_enforce_email_allowlist_before
  BEFORE INSERT OR UPDATE OF email ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_email_allowlist();

-- Dedicated AFTER INSERT trigger for initial profile provisioning with fully qualified names
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    NEW.id,
    pg_catalog.lower(NEW.email),
    pg_catalog.split_part(NEW.email, '@', 1)
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_handle_new_user_profile ON auth.users;
CREATE TRIGGER trg_handle_new_user_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_profile();

