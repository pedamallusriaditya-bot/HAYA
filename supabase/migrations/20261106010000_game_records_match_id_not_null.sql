/*
  # Backfill match_id and set NOT NULL on game_records
  - Backfills existing NULL match_id values with gen_random_uuid()::text.
  - Sets match_id column to NOT NULL to enforce unique constraint deduplication.
  - Table remains strictly append-only (no user UPDATE policy or grant added).
*/

UPDATE public.game_records
SET match_id = gen_random_uuid()::text
WHERE match_id IS NULL;

ALTER TABLE public.game_records
ALTER COLUMN match_id SET NOT NULL;
