/*
  # Recreate protect_invitation_update as SECURITY INVOKER
  - Replaces public.protect_invitation_update() with SECURITY INVOKER.
  - The function only checks OLD/NEW record fields and pg_catalog.clock_timestamp();
    it requires no elevated privileges or search_path overrides.
  - Retains identical validation logic and SET search_path = ''.
*/

CREATE OR REPLACE FUNCTION public.protect_invitation_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
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
