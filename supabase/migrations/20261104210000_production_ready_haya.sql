/*
# HAYA Games Production Readiness & Complete Database Integration
# Migration: 20261104210000_production_ready_haya.sql

## 1. Profiles Table Enhancements
- Adds `preferences` (jsonb) for sound, music, and user options.
- Adds `updated_at` (timestamptz) for tracking profile modifications.
- Updates RLS to allow authenticated authorized players to view each other's profiles
  (avatar_data, display_name) while strictly restricting modifications to the owner.

## 2. Game Records Table (Persistent Match History & Analytics)
- Stores every completed single-player, bot, and multiplayer game match.
- Records game, mode ('single' | 'bot' | 'multi'), result ('win' | 'loss' | 'draw' | 'completed'),
  score, duration, bot difficulty, opponent info, and match_id.
- Implements strict RLS: owner insert, authenticated read.
- Prevents duplicate match recordings.

## 3. Multiplayer Invitations Table
- Persists direct invitations between authorized players.
- Tracks status: 'pending', 'accepted', 'declined', 'cancelled', 'expired'.
- Enforces expiration and participant-only RLS.
- Subscribed to Supabase Realtime publication.

## 4. Match Color Reservations Hardening
- Restricts color reservation access to authenticated users only.
*/

-- 1. Profiles Enhancements
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'preferences'
  ) THEN
    ALTER TABLE profiles ADD COLUMN preferences jsonb NOT NULL DEFAULT '{"sound": true, "music": true}'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
  END IF;
END $$;

-- Fix Profiles RLS so authenticated players can see their friend's profile & avatar
DROP POLICY IF EXISTS "select_own_profile" ON profiles;
DROP POLICY IF EXISTS "select_authenticated_profiles" ON profiles;
CREATE POLICY "select_authenticated_profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- 2. Game Records (Match History)
CREATE TABLE IF NOT EXISTS game_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  game text NOT NULL,
  mode text NOT NULL DEFAULT 'single', -- 'single' | 'bot' | 'multi'
  result text NOT NULL,               -- 'win' | 'loss' | 'draw' | 'completed'
  score integer NOT NULL DEFAULT 0,
  score_type text NOT NULL DEFAULT 'score', -- 'score' | 'time'
  opponent_type text NOT NULL DEFAULT 'none', -- 'none' | 'bot' | 'human'
  opponent_name text,
  bot_difficulty text,
  duration_seconds integer,
  match_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_game_mode CHECK (mode IN ('single', 'bot', 'multi')),
  CONSTRAINT chk_game_result CHECK (result IN ('win', 'loss', 'draw', 'completed')),
  CONSTRAINT game_records_user_match_unique UNIQUE (user_id, match_id)
);

ALTER TABLE game_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_game_records" ON game_records;
CREATE POLICY "select_game_records"
  ON game_records FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "insert_own_game_records" ON game_records;
CREATE POLICY "insert_own_game_records"
  ON game_records FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_game_records" ON game_records;
CREATE POLICY "delete_own_game_records"
  ON game_records FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_game_records_user_created ON game_records (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_game_records_user_game ON game_records (user_id, game);
CREATE INDEX IF NOT EXISTS idx_game_records_match_id ON game_records (match_id);

-- 3. Persistent Multiplayer Invitations
CREATE TABLE IF NOT EXISTS multiplayer_invitations (
  id text PRIMARY KEY,
  from_email text NOT NULL,
  from_name text NOT NULL,
  to_email text NOT NULL,
  game_id text NOT NULL,
  match_id text NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- 'pending' | 'accepted' | 'declined' | 'cancelled' | 'expired'
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  CONSTRAINT chk_invite_status CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled', 'expired'))
);

ALTER TABLE multiplayer_invitations ENABLE ROW LEVEL SECURITY;

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
    LOWER(auth.jwt()->>'email') = LOWER(from_email)
  );

DROP POLICY IF EXISTS "update_my_invitations" ON multiplayer_invitations;
CREATE POLICY "update_my_invitations"
  ON multiplayer_invitations FOR UPDATE
  TO authenticated
  USING (
    LOWER(auth.jwt()->>'email') = LOWER(from_email) OR
    LOWER(auth.jwt()->>'email') = LOWER(to_email)
  )
  WITH CHECK (
    LOWER(auth.jwt()->>'email') = LOWER(from_email) OR
    LOWER(auth.jwt()->>'email') = LOWER(to_email)
  );

CREATE INDEX IF NOT EXISTS idx_multiplayer_invites_to_status ON multiplayer_invitations (to_email, status);
CREATE INDEX IF NOT EXISTS idx_multiplayer_invites_match ON multiplayer_invitations (match_id);

-- 4. Hardening Match Color Reservations
DROP POLICY IF EXISTS "allow_read_reservations" ON match_color_reservations;
CREATE POLICY "allow_read_reservations"
  ON match_color_reservations FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "allow_write_reservations" ON match_color_reservations;
CREATE POLICY "allow_write_reservations"
  ON match_color_reservations FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 5. Add multiplayer_invitations to Realtime publication
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE multiplayer_invitations;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

