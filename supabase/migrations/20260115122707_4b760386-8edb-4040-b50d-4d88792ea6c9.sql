-- Remove old 0-1 range check constraints that conflict with new integer ranges
ALTER TABLE public.chat_ratings DROP CONSTRAINT IF EXISTS chat_ratings_disagreement_check;
ALTER TABLE public.chat_ratings DROP CONSTRAINT IF EXISTS chat_ratings_empathy_check;