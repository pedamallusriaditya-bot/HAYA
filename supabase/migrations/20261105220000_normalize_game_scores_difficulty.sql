/*
  # Normalize game_scores difficulty and prevent NULL constraint bypass

  Migration: 20261105220000_normalize_game_scores_difficulty.sql

  ## Summary
  1. Removes duplicate rows per (user_id, game, difficulty), treating NULL as 'default'.
     PostgreSQL treats NULLs as distinct in UNIQUE constraints, so the old client
     (which sent NULL difficulty for games like 2048) inserted a new row on every
     score submit. Keeps the single best row per group:
       - Highest score when score_type = 'score'
       - Lowest score when score_type = 'time'
  2. Backfills the remaining NULL difficulty values to 'default'.
     (This runs AFTER the dedupe so the UPDATE cannot collide with the
     UNIQUE (user_id, game, difficulty) constraint.)
  3. Sets column difficulty to NOT NULL DEFAULT 'default' so future selects
     and upserts always match deterministically.
  4. Ensures the UNIQUE (user_id, game, difficulty) constraint exists.
*/

-- 1. Remove duplicates first (NULL counts as 'default'), keeping the best row
WITH ranked_scores AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, game, COALESCE(difficulty, 'default')
      ORDER BY
        CASE
          WHEN score_type = 'time' THEN score
          ELSE -score
        END ASC,
        created_at ASC,
        id ASC
    ) AS rnk
  FROM game_scores
)
DELETE FROM game_scores
WHERE id IN (
  SELECT id FROM ranked_scores WHERE rnk > 1
);

-- 2. Backfill remaining NULL difficulties to 'default'
UPDATE game_scores
SET difficulty = 'default'
WHERE difficulty IS NULL;

-- 3. Enforce NOT NULL DEFAULT 'default'
ALTER TABLE game_scores
  ALTER COLUMN difficulty SET DEFAULT 'default',
  ALTER COLUMN difficulty SET NOT NULL;

-- 4. Make sure the unique constraint exists and is active
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'scores_unique'
  ) THEN
    ALTER TABLE game_scores
      ADD CONSTRAINT scores_unique UNIQUE (user_id, game, difficulty);
  END IF;
END $$;