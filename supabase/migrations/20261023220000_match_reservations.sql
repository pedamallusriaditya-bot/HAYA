/*
# Match Color Reservations Schema
Enforces authoritative, first-come first-served color reservations for 2-player online matches.
Guarantees at the database level that no two players can claim the same color in a match.
*/

CREATE TABLE IF NOT EXISTS match_color_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id text NOT NULL,
  color text NOT NULL,
  user_email text NOT NULL,
  user_name text NOT NULL,
  reserved_at timestamptz DEFAULT now(),
  CONSTRAINT match_color_unique UNIQUE (match_id, color),
  CONSTRAINT match_user_unique UNIQUE (match_id, user_email)
);

ALTER TABLE match_color_reservations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_read_reservations" ON match_color_reservations;
CREATE POLICY "allow_read_reservations"
  ON match_color_reservations FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "allow_write_reservations" ON match_color_reservations;
CREATE POLICY "allow_write_reservations"
  ON match_color_reservations FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);
