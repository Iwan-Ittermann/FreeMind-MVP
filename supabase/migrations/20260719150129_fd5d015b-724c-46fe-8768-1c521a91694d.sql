CREATE TABLE public.signups (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email                     text NOT NULL,
  confirm_token             text,
  confirm_token_expires_at  timestamptz,
  confirmed_at              timestamptz,
  created_at                timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX signups_email_lower_idx ON public.signups (lower(email));
CREATE INDEX signups_confirm_token_idx ON public.signups (confirm_token) WHERE confirm_token IS NOT NULL;

GRANT ALL ON public.signups TO service_role;

ALTER TABLE public.signups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No public reads"  ON public.signups FOR SELECT USING (false);
CREATE POLICY "No public writes" ON public.signups FOR INSERT WITH CHECK (false);
CREATE POLICY "No public updates" ON public.signups FOR UPDATE USING (false) WITH CHECK (false);
CREATE POLICY "No public deletes" ON public.signups FOR DELETE USING (false);