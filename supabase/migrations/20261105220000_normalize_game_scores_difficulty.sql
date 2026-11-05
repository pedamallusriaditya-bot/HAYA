/*
# Normalize game_scores difficulty and prevent NULL constraint bypass
# Migration: 20261105220000_normalize_game_scores_difficulty.sql

## Summary:
1. Backfills existing NULL difficulty values in `game_scores` to 'default'.
2. Removes duplicate rows per (user_id, game, difficulty) caused by PostgreSQL treating
   NULLs as distinct in the original UNIQUE (user_id, game, difficulty) constraint.
   Keeps the single best row per (user_id, game, difficulty):
   - Highest score when score_type = 'score'
   - Lowest score when score_type = 'time'
3. Sets column `difficulty` to NOT NULL DEFAULT 'default' to guarantee all future
   selects and upserts match deterministically.
4. Ensures the UNIQUE (user_id, game, difficulty) constraint is strictly enforced.
*/

-- 1. Backfill existing NULL difficulties to 'default'
UPDATE game_scores
SET difficulty = 'default'
WHERE difficulty IS NULL;

-- 2. Remove duplicate rows per (user_id, game, difficulty), keeping the best score
WITH ranked_scores AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, game, difficulty
      ORDER BY
        CASE
          WHEN score_type = 'time' THEN score
          ELSE -score
        END ASC,
        created_at ASC,
        id ASC
    ) AS rank
  FROM game_scores
)
DELETE FROM game_scores
WHERE id IN (
  SELECT id FROM ranked_scores WHERE rank > 1
);

-- 3. Alter column to NOT NULL DEFAULT 'default'
ALTER TABLE game_scores
  ALTER COLUMN difficulty SET DEFAULT 'default',
  ALTER COLUMN difficulty SET NOT NULL;

-- 4. Ensure unique constraint is present and active
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

