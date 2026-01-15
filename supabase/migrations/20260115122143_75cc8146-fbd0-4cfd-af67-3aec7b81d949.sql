-- Widen rating scale to match new internal UI ranges
-- Empathy: -50..50 (integer)
-- Disagreement: 0..100 (integer)

ALTER TABLE public.chat_ratings
  ALTER COLUMN empathy TYPE integer USING round(empathy)::int,
  ALTER COLUMN disagreement TYPE integer USING round(disagreement)::int;

-- Optional range guards
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chat_ratings_empathy_range'
  ) THEN
    ALTER TABLE public.chat_ratings
      ADD CONSTRAINT chat_ratings_empathy_range CHECK (empathy BETWEEN -50 AND 50);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chat_ratings_disagreement_range'
  ) THEN
    ALTER TABLE public.chat_ratings
      ADD CONSTRAINT chat_ratings_disagreement_range CHECK (disagreement BETWEEN 0 AND 100);
  END IF;
END $$;