CREATE TABLE public.wedium_signups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  confirm_token text,
  confirm_token_expires_at timestamptz,
  confirmed_at timestamptz,
  passphrase text,
  passphrase_issued_at timestamptz,
  auth_user_id uuid,
  last_passphrase_sent_at timestamptz,
  signup_ip inet,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX wedium_signups_email_key ON public.wedium_signups (lower(email));
CREATE INDEX wedium_signups_token_idx ON public.wedium_signups (confirm_token);

GRANT ALL ON public.wedium_signups TO service_role;
ALTER TABLE public.wedium_signups ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.wedium_campaign_sends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_key text NOT NULL,
  signup_id uuid NOT NULL REFERENCES public.wedium_signups(id) ON DELETE CASCADE,
  recipient_email text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  opened_at timestamptz,
  open_count integer NOT NULL DEFAULT 0,
  UNIQUE (campaign_key, signup_id)
);

GRANT ALL ON public.wedium_campaign_sends TO service_role;
ALTER TABLE public.wedium_campaign_sends ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.wedium_verified_participants (
  user_id uuid PRIMARY KEY,
  signup_id uuid NOT NULL REFERENCES public.wedium_signups(id) ON DELETE CASCADE,
  verified_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.wedium_verified_participants TO authenticated;
GRANT ALL ON public.wedium_verified_participants TO service_role;
ALTER TABLE public.wedium_verified_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see their own wedium verification"
ON public.wedium_verified_participants
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE TRIGGER wedium_signups_updated_at
BEFORE UPDATE ON public.wedium_signups
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.is_verified_participant(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.verified_participants WHERE user_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM public.wedium_verified_participants WHERE user_id = _user_id
  )
$$;