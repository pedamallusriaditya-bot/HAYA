# Supabase Database Architecture & Migrations

This directory contains the schema migrations for HAYA Games, an offline-first, private two-player arcade platform backed by Supabase PostgreSQL.

---

## 📜 Migrations Ledger (Chronological)

1. **`20261019113040_haya_foundation.sql`**
   - Creates `public.allowed_emails`, `public.profiles`, and `public.game_scores`.
   - Adds `handle_new_user` trigger on `auth.users` to automatically populate profiles on signup.
   - Sets baseline RLS policies on profiles and game scores. Seeds initial placeholder emails.

2. **`20261023220000_match_reservations.sql`**
   - Creates `public.match_color_reservations` for authoritative, first-come-first-served multiplayer seat/color locking.
   - Enables RLS and registers table to `supabase_realtime` publication.

3. **`20261028220000_avatar_data.sql`**
   - Adds `avatar_data jsonb` column to `public.profiles` for custom 2D SVG avatar configurations.

4. **`20261104210000_production_ready_haya.sql`**
   - Creates `public.game_records` with `UNIQUE (user_id, match_id)` for permanent match logging.
   - Creates `public.multiplayer_invitations` with status checks and expiration timestamps.
   - Adds `game_records` and `multiplayer_invitations` to `supabase_realtime` publication.

5. **`20261104220000_hardened_security_and_rls.sql`**
   - Hardens `game_records` (drops UPDATE policy for immutability; authenticated SELECT). *(Supersedes baseline update policy)*
   - Splits `multiplayer_invitations` UPDATE into separate `recipient_respond_invitation` and `sender_cancel_invitation` policies. *(Supersedes broad `update_my_invitations`)*
   - Scopes `match_color_reservations` insert/update to match participants.

6. **`20261105220000_normalize_game_scores_difficulty.sql`**
   - Normalizes `game_scores.difficulty` (`DEFAULT 'default'`), backfills NULLs, deduplicates rows, and establishes `UNIQUE (user_id, game, difficulty)`.

7. **`20261105230000_hardened_rls_and_security_perfection.sql`**
   - Grants column-level UPDATE on `profiles` (blocks tampering with `is_admin` and `email`).
   - Makes `game_records` append-only by dropping `delete_own_game_records` and revoking DELETE. *(Supersedes delete policy)*
   - Adds `protect_invitation_update` trigger on `multiplayer_invitations` preventing metadata tampering and post-expiration acceptance.
   - Revokes anon access on `allowed_emails`.
   - Adds `validate_user_signup_or_email_change` trigger on `auth.users` to block unauthorized signups at the DB level.

8. **`20261105233000_migrate_preferences_to_user_preferences.sql`**
   - Creates `public.user_preferences` table with owner-only RLS (`auth.uid() = user_id`).
   - Migrates user preferences from `profiles.preferences` and drops `profiles.preferences` column.
   - Re-grants column-level UPDATE on `profiles` for `(display_name, avatar_data, updated_at)`.

9. **`20261105234500_realtime_private_channels_and_rls.sql`**
   - Enables RLS on `realtime.messages` with `allow_authenticated_allowlisted_select` and `allow_authenticated_allowlisted_insert` requiring email allowlist verification.

10. **`20261106000000_profile_insert_lockdown.sql`**
    - Revokes `INSERT` on `public.profiles` from `authenticated` and `anon` roles (enforcing profile creation exclusively via the SECURITY DEFINER signup trigger).
    - Ensures RLS on `realtime.messages` is explicitly enabled.

11. **`20261106010000_game_records_match_id_not_null.sql`**
    - Backfills NULL `match_id` values in `public.game_records` with `gen_random_uuid()::text`.
    - Enforces `match_id NOT NULL` to guarantee deterministic deduplication via `UNIQUE (user_id, match_id)`.

12. **`20261106020000_realtime_topic_scoping.sql`**
    - Drops and recreates `realtime.messages` policies to restrict topics to authorized channels: `'haya-global-lobby'`, `'haya-invitations-db'`, and dynamic match channels `'haya-match-%'`. *(Supersedes unbounded topic policies from 20261105234500)*

13. **`20261106030000_invitation_trigger_security_invoker.sql`**
    - Recreates `public.protect_invitation_update()` as `SECURITY INVOKER` instead of `SECURITY DEFINER`.

---

## 🏛️ Final Effective Architecture

### 1. Tables & Schema
- **`public.allowed_emails`**: Whitelist of authorized player emails. Anon access revoked.
- **`public.profiles`**: Public player profiles (`id`, `email`, `display_name`, `avatar_data`, `is_admin`, timestamps). No preferences column (moved to `user_preferences`).
- **`public.user_preferences`**: Private per-user audio/theme settings (`user_id`, `sound`, `music`, `theme`, `updated_at`).
- **`public.game_scores`**: High scores per game and difficulty (`user_id`, `game`, `difficulty`, `score`, `score_type`, timestamps). Unique constraint on `(user_id, game, difficulty)`.
- **`public.game_records`**: Append-only match history log (`id`, `user_id`, `game`, `mode`, `result`, `score`, `match_id NOT NULL`, etc.). Unique constraint on `(user_id, match_id)`.
- **`public.multiplayer_invitations`**: 45-second peer match invites (`id`, `from_email`, `to_email`, `game_id`, `match_id`, `status`, `expires_at`).
- **`public.match_color_reservations`**: First-come seat locking per online match (`match_id`, `color`, `user_id`, `user_email`, `user_name`).

### 2. RLS & Permissions Summary
- **Profiles**:
  - `SELECT`: All authenticated users can read profiles.
  - `INSERT`: Revoked from `authenticated` and `anon`. Managed exclusively by `handle_new_user` signup trigger.
  - `UPDATE`: Authenticated users can only update their own row (`auth.uid() = id`), restricted to columns `(display_name, avatar_data, updated_at)`. `is_admin` and `email` updates are prohibited.
  - `DELETE`: Revoked.
- **User Preferences**:
  - `ALL`: Strictly isolated to owner (`auth.uid() = user_id`).
- **Game Records**:
  - `SELECT`: Authenticated users can inspect history.
  - `INSERT`: Authenticated users can log their own matches (`auth.uid() = user_id`).
  - `UPDATE`: No policy exists; records are immutable.
  - `DELETE`: Revoked from all roles; table is strictly append-only.
- **Multiplayer Invitations**:
  - `SELECT`: Only sender or recipient.
  - `INSERT`: Only sender (`from_email = auth.jwt()->>'email'`).
  - `UPDATE`: Separate policies: recipient can accept (if not expired) or decline; sender can cancel. Trigger `protect_invitation_update` (SECURITY INVOKER) enforces metadata immutability.
- **Realtime Channels (`realtime.messages`)**:
  - `SELECT` and `INSERT`: Restricted to verified authenticated users whose email resides in `allowed_emails`, and scoped to authorized topics (`'haya-global-lobby'`, `'haya-invitations-db'`, `'haya-match-%'`).
- **Auth Trigger (`auth.users`)**:
  - `BEFORE INSERT OR UPDATE OF email`: Executes `validate_user_signup_or_email_change()` to reject signups not present in `public.allowed_emails`.
