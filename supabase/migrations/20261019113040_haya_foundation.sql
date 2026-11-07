/*
# HAYA Games foundation schema

## Purpose
Sets up the core database for HAYA Games: a two-account email allowlist enforced
server-side, a profiles table, and per-user high scores for single-player games.

## 1. New Tables

### `allowed_emails`
- `email` (text, primary key, lowercased) — the only email addresses permitted
  to sign in. Seeded with the two authorized addresses.
- `created_at` (timestamptz)

### `profiles`
- `id` (uuid, primary key, references auth.users ON DELETE CASCADE)
- `email` (text)
- `display_name` (text)
- `is_admin` (boolean, default false) — administrator flag, separate from allowlist.
- `created_at` (timestamptz)

### `game_scores`
- `id` (uuid, primary key)
- `user_id` (uuid, not null, defaults to auth.uid(), references auth.users)
- `game` (text, not null) — 'sudoku' | 'minesweeper' | '2048' | 'maze' | 'memory'
- `difficulty` (text, nullable)
- `score` (integer, not null)
- `score_type` (text, default 'score') — 'score' (higher better) or 'time' (lower better)
- `created_at` (timestamptz)
- Unique (user_id, game, difficulty) so only the best score is kept.

## 2. Security — RLS
- `allowed_emails`: readable by anon+authenticated (for friendly client messaging);
  writes only via service role.
- `profiles`: owner-scoped CRUD.
- `game_scores`: owner-scoped CRUD.

## 3. Allowlist enforcement
A SECURITY DEFINER trigger on auth.users AFTER INSERT deletes any newly created
account whose email (lowercased) is not in allowed_emails, and raises an exception
so sign-up is rejected at the database level. This is the real boundary; the
frontend check is only for UX.

## 4. Notes
1. To add/remove authorized accounts, edit allowed_emails with the service role.
2. Admin status is independent: profiles.is_admin defaults to false and is set
   directly in the database.
3. Public sign-up is effectively disabled.
*/

CREATE TABLE IF NOT EXISTS allowed_emails (
  email text PRIMARY KEY,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE allowed_emails ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_allowed_emails" ON allowed_emails;
CREATE POLICY "read_allowed_emails"
  ON allowed_emails FOR SELECT
  TO anon, authenticated
  USING (true);

INSERT INTO allowed_emails (email) VALUES
  ('player1@example.com'),
  ('player2@example.com')
ON CONFLICT (email) DO NOTHING;

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  display_name text,
  is_admin boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile"
  ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile"
  ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TABLE IF NOT EXISTS game_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  game text NOT NULL,
  difficulty text,
  score integer NOT NULL,
  score_type text NOT NULL DEFAULT 'score',
  created_at timestamptz DEFAULT now(),
  CONSTRAINT scores_unique UNIQUE (user_id, game, difficulty)
);

ALTER TABLE game_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_scores" ON game_scores;
CREATE POLICY "select_own_scores"
  ON game_scores FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_scores" ON game_scores;
CREATE POLICY "insert_own_scores"
  ON game_scores FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_scores" ON game_scores;
CREATE POLICY "update_own_scores"
  ON game_scores FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_scores" ON game_scores;
CREATE POLICY "delete_own_scores"
  ON game_scores FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS game_scores_game_idx ON game_scores (game, score DESC);

CREATE OR REPLACE FUNCTION enforce_email_allowlist()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM allowed_emails WHERE email = LOWER(NEW.email)
  ) THEN
    DELETE FROM auth.users WHERE id = NEW.id;
    RAISE EXCEPTION 'This email is not authorized to use HAYA Games.';
  END IF;

  INSERT INTO profiles (id, email, display_name)
  VALUES (NEW.id, LOWER(NEW.email), split_part(NEW.email, '@', 1))
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_email_allowlist ON auth.users;
CREATE TRIGGER trg_enforce_email_allowlist
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION enforce_email_allowlist();
