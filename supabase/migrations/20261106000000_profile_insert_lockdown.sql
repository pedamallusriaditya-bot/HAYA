/*
  # Lock down profile inserts and make realtime RLS explicit
  - Profiles are created only by the SECURITY DEFINER signup trigger.
  - Enabling RLS on realtime.messages is idempotent and guarantees the
    private-channel policies actually apply.
*/

REVOKE INSERT ON public.profiles FROM authenticated, anon;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'realtime' AND table_name = 'messages'
  ) THEN
    EXECUTE 'ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY';
  END IF;
END $$;

