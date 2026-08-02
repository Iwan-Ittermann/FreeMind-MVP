CREATE TABLE public.campaign_sends (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_key text NOT NULL,
  signup_id uuid NOT NULL REFERENCES public.signups(id) ON DELETE CASCADE,
  recipient_email text NOT NULL,
  sent_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (campaign_key, signup_id)
);

GRANT ALL ON public.campaign_sends TO service_role;

ALTER TABLE public.campaign_sends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role manages campaign sends"
ON public.campaign_sends FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX idx_campaign_sends_key ON public.campaign_sends (campaign_key);