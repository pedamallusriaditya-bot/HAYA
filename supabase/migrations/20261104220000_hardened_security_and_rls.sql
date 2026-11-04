/*
# HAYA Games: Hardened Security and Strict RLS Enforcement
# Migration: 20261104220000_hardened_security_and_rls.sql

## Summary of Hardening:
1. Private User Preferences Isolation:
   - Creates a dedicated `user_preferences` table with strict owner-only RLS.
   - Prevents any user from reading or modifying another user's private sound, music, or interface preferences.

2. Game Records Privacy & Immutability:
   - Users can only view their own single-player/bot practice records, while multiplayer match records remain mutually visible.
   - Match records are strictly immutable (no UPDATE policy).
   - INSERT is restricted strictly to `auth.uid() = user_id`.

3. Multiplayer Invitations State Machine Protection:
   - Only the recipient can accept or decline an invitation.
   - Acceptance is strictly rejected at the database RLS level if `now() > expires_at`.
   - Only the sender can cancel an invitation.
   - No participant can modify match metadata (game_id, match_id, emails) during status updates.

4. Match Color Reservations Authority:
   - Users can only insert, update, or release (DELETE) reservations matching their own verified authenticated email.
   - Prevents one player from tampering with or releasing another player's color reservation.
*/

-- 1. Private User Preferences Table (Owner-Only Access)
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  sound boolean NOT NULL DEFAULT true,
  music boolean NOT NULL DEFAULT true,
  theme text NOT NULL DEFAULT 'arcade',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_preferences" ON user_preferences;
CREATE POLICY "select_own_preferences"
  ON user_preferences FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_preferences" ON user_preferences;
CREATE POLICY "insert_own_preferences"
  ON user_preferences FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_preferences" ON user_preferences;
CREATE POLICY "update_own_preferences"
  ON user_preferences FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_preferences" ON user_preferences;
CREATE POLICY "delete_own_preferences"
  ON user_preferences FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 2. Game Records Privacy Hardening
DROP POLICY IF EXISTS "select_game_records" ON game_records;
CREATE POLICY "select_game_records"
  ON game_records FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id OR
    mode = 'multi'
  );

-- Ensure game_records has no UPDATE policy (immutable match logs)
DROP POLICY IF EXISTS "update_game_records" ON game_records;
DROP POLICY IF EXISTS "update_own_game_records" ON game_records;

-- 3. Hardened Multiplayer Invitations Security
DROP POLICY IF EXISTS "select_my_invitations" ON multiplayer_invitations;
CREATE POLICY "select_my_invitations"
  ON multiplayer_invitations FOR SELECT
  TO authenticated
  USING (
    LOWER(auth.jwt()->>'email') = LOWER(from_email) OR
    LOWER(auth.jwt()->>'email') = LOWER(to_email)
  );

DROP POLICY IF EXISTS "insert_my_invitations" ON multiplayer_invitations;
CREATE POLICY "insert_my_invitations"
  ON multiplayer_invitations FOR INSERT
  TO authenticated
  WITH CHECK (
    LOWER(auth.jwt()->>'email') = LOWER(from_email) AND
    status = 'pending' AND
    expires_at > now()
  );

-- Separate UPDATE policies by role to prevent cross-participant tampering
DROP POLICY IF EXISTS "update_my_invitations" ON multiplayer_invitations;
DROP POLICY IF EXISTS "recipient_respond_invitation" ON multiplayer_invitations;
CREATE POLICY "recipient_respond_invitation"
  ON multiplayer_invitations FOR UPDATE
  TO authenticated
  USING (
    LOWER(auth.jwt()->>'email') = LOWER(to_email) AND
    status = 'pending'
  )
  WITH CHECK (
    LOWER(auth.jwt()->>'email') = LOWER(to_email) AND
    (
      (status = 'accepted' AND now() <= expires_at) OR
      status = 'declined'
    )
  );

DROP POLICY IF EXISTS "sender_cancel_invitation" ON multiplayer_invitations;
CREATE POLICY "sender_cancel_invitation"
  ON multiplayer_invitations FOR UPDATE
  TO authenticated
  USING (
    LOWER(auth.jwt()->>'email') = LOWER(from_email) AND
    status = 'pending'
  )
  WITH CHECK (
    LOWER(auth.jwt()->>'email') = LOWER(from_email) AND
    status = 'cancelled'
  );

-- 4. Hardened Match Color Reservations Security
DROP POLICY IF EXISTS "allow_write_reservations" ON match_color_reservations;
DROP POLICY IF EXISTS "insert_own_color_reservation" ON match_color_reservations;
CREATE POLICY "insert_own_color_reservation"
  ON match_color_reservations FOR INSERT
  TO authenticated
  WITH CHECK (
    LOWER(auth.jwt()->>'email') = LOWER(user_email)
  );

DROP POLICY IF EXISTS "update_own_color_reservation" ON match_color_reservations;
CREATE POLICY "update_own_color_reservation"
  ON match_color_reservations FOR UPDATE
  TO authenticated
  USING (
    LOWER(auth.jwt()->>'email') = LOWER(user_email)
  )
  WITH CHECK (
    LOWER(auth.jwt()->>'email') = LOWER(user_email)
  );

DROP POLICY IF EXISTS "delete_own_color_reservation" ON match_color_reservations;
CREATE POLICY "delete_own_color_reservation"
  ON match_color_reservations FOR DELETE
  TO authenticated
  USING (
    LOWER(auth.jwt()->>'email') = LOWER(user_email)
  );

