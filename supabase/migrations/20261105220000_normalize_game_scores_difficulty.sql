UPDATE game_scores
SET difficulty = 'default'
WHERE difficulty IS NULL;
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