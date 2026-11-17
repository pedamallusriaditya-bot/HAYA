/*
  # Scope Realtime Messages Policies to Authorized Topics
  - Updates SELECT and INSERT policies on realtime.messages
  - Restricts realtime topics to known channels: 'haya-global-lobby', 'haya-invitations-db', and 'haya-match-%'
  - Retains strict email allowlist validation from public.allowed_emails
*/

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'realtime' AND table_name = 'messages'
  ) THEN
    EXECUTE 'GRANT SELECT, INSERT ON realtime.messages TO authenticated';

    -- 1. Recreate policy for SELECT (Listen / Receive Broadcast & Presence)
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
        AND (
          realtime.topic() IN (''haya-global-lobby'', ''haya-invitations-db'')
          OR realtime.topic() LIKE ''haya-match-%''
        )
      )';

    -- 2. Recreate policy for INSERT (Send Broadcast & Track Presence)
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
        AND (
          realtime.topic() IN (''haya-global-lobby'', ''haya-invitations-db'')
          OR realtime.topic() LIKE ''haya-match-%''
        )
      )';
  ELSE
    RAISE NOTICE 'realtime.messages table not present in this database instance; skipping realtime policy setup.';
  END IF;
END $$;
