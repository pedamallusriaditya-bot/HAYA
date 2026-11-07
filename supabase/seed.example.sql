-- HAYA Games: Example seed file for authorized player emails.
--
-- INSTRUCTIONS:
-- 1. Copy this file to `supabase/seed.sql` (which is gitignored).
-- 2. Replace the placeholder emails below with your actual authorized player email addresses.
-- 3. Run this SQL manually in the Supabase SQL Editor for your project.
-- 4. NEVER commit real email addresses or `supabase/seed.sql` to version control.

INSERT INTO allowed_emails (email) VALUES
  ('player1@example.com'),
  ('player2@example.com')
ON CONFLICT (email) DO NOTHING;

