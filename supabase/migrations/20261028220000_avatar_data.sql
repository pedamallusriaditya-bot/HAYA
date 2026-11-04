/*
# Add avatar_data column to profiles

Allows users to store their custom 2D avatar configuration as structured JSON.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'avatar_data'
  ) THEN
    ALTER TABLE profiles ADD COLUMN avatar_data jsonb;
  END IF;
END $$;
