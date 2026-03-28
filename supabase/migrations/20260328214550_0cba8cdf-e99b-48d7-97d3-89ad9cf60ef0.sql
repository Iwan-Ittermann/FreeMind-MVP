
ALTER TABLE public.test_diskussion_replies
  ADD COLUMN warmth integer,
  ADD COLUMN understanding integer,
  ADD COLUMN sincerity integer;

ALTER TABLE public.test_diskussion_replies
  ALTER COLUMN name DROP NOT NULL,
  ALTER COLUMN message DROP NOT NULL;
