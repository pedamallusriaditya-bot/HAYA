/*
# Migrate User Preferences to Dedicated Private Table and Drop profiles.preferences
# Migration: 20261105233000_migrate_preferences_to_user_preferences.sql

## Summary:
1. Data Migration:
   - Copies existing preferences JSON data from `profiles.preferences` into the dedicated
     `user_preferences` table (extracting sound, music, theme, updated_at).
   - Resolves conflicts cleanly with ON CONFLICT (user_id) DO UPDATE.
2. Schema Clean-up:
   - Drops `preferences` column from `public.profiles` so player preferences are completely
     private and isolated behind `user_preferences` owner-only RLS.
3. Permissions:
   - Re-grants column-level UPDATE on `public.profiles` exclusively for (display_name, avatar_data, updated_at).
   - Confirms SELECT, INSERT, UPDATE, DELETE grants on `public.user_preferences` for authenticated users.
*/

-- 1. Ensure user_preferences table exists (safety check)
CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  sound boolean NOT NULL DEFAULT true,
  music boolean NOT NULL DEFAULT true,
  theme text NOT NULL DEFAULT 'arcade',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- 2. Migrate existing profiles.preferences data into user_preferences
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'preferences'
  ) THEN
    INSERT INTO public.user_preferences (user_id, sound, music, theme, updated_at)
    SELECT
      p.id AS user_id,
      COALESCE((p.preferences->>'sound')::boolean, true) AS sound,
      COALESCE((p.preferences->>'music')::boolean, true) AS music,
      COALESCE(NULLIF(p.preferences->>'theme', ''), 'arcade') AS theme,
      COALESCE(p.updated_at, now()) AS updated_at
    FROM public.profiles p
    WHERE p.preferences IS NOT NULL
    ON CONFLICT (user_id) DO UPDATE
    SET
      sound = EXCLUDED.sound,
      music = EXCLUDED.music,
      theme = EXCLUDED.theme,
      updated_at = EXCLUDED.updated_at;

    -- 3. Drop preferences column from profiles
    ALTER TABLE public.profiles DROP COLUMN preferences;
  END IF;
END $$;

-- 4. Re-grant update permissions on profiles (without preferences)
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (display_name, avatar_data, updated_at) ON public.profiles TO authenticated;

-- 5. Grant permissions on user_preferences to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_preferences TO authenticated;

-- 6. Ensure owner-only RLS policies on user_preferences
DROP POLICY IF EXISTS "select_own_preferences" ON public.user_preferences;
CREATE POLICY "select_own_preferences"
  ON public.user_preferences FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_preferences" ON public.user_preferences;
CREATE POLICY "insert_own_preferences"
  ON public.user_preferences FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_preferences" ON public.user_preferences;
CREATE POLICY "update_own_preferences"
  ON public.user_preferences FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_preferences" ON public.user_preferences;
CREATE POLICY "delete_own_preferences"
  ON public.user_preferences FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

