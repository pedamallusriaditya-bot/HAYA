/*
# Supabase Realtime Authorization: Private Channels & RLS on realtime.messages
# Migration: 20261105234500_realtime_private_channels_and_rls.sql

## Summary:
1. Enforces Private Realtime Channels:
   - Configures Supabase Realtime Authorization using Row Level Security (RLS) on `realtime.messages`.
   - Restricts SELECT (listening to broadcast & presence) to authenticated users whose verified JWT email
     resides in the `public.allowed_emails` table.
   - Restricts INSERT (broadcasting & presence tracking) to authenticated users whose verified JWT email
     resides in the `public.allowed_emails` table.
2. Privacy & Zero-Trust Defense:
   - Prevents unallowlisted authenticated accounts or anonymous clients from tapping into or spoofing
     messages on `haya-global-lobby`, `haya-invitations-db`, and match channels (`haya-match-<id>`).
*/

DO $$
BEGIN
  -- Verify realtime schema and messages table exist in the Supabase environment
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'realtime' AND table_name = 'messages'
  ) THEN
    -- Grant SELECT and INSERT on realtime.messages to authenticated users
    EXECUTE 'GRANT SELECT, INSERT ON realtime.messages TO authenticated';

    -- 1. Policy for SELECT (Listen / Receive Broadcast & Presence)
    EXECUTE 'DROP POLICY IF EXISTS "allow_authenticated_allowlisted_select" ON realtime.messages';
    EXECUTE 'CREATE POLICY "allow_authenticated_allowlisted_select"
      ON realtime.messages
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.allowed_emails ae
          WHERE ae.email = lower(auth.jwt() ->> ''email'')
        )
      )';

    -- 2. Policy for INSERT (Send Broadcast & Track Presence)
    EXECUTE 'DROP POLICY IF EXISTS "allow_authenticated_allowlisted_insert" ON realtime.messages';
    EXECUTE 'CREATE POLICY "allow_authenticated_allowlisted_insert"
      ON realtime.messages
      FOR INSERT
      TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.allowed_emails ae
          WHERE ae.email = lower(auth.jwt() ->> ''email'')
        )
      )';
  ELSE
    RAISE NOTICE 'realtime.messages table not present in this database instance; skipping realtime policy setup.';
  END IF;
END $$;

