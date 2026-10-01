ALTER TABLE public.gutefrage_signups
  ADD COLUMN post_id text NOT NULL DEFAULT 'unattributed',
  ADD COLUMN utm_source text,
  ADD COLUMN utm_medium text,
  ADD COLUMN utm_campaign text,
  ADD COLUMN utm_content text,
  ADD COLUMN is_test boolean NOT NULL DEFAULT false,
  ADD COLUMN analytics_id text;