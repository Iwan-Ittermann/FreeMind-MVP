CREATE TABLE public.gutefrage_signups (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL,
  confirm_token text,
  confirm_token_expires_at timestamptz,
  confirmed_at timestamptz,
  signup_ip inet,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX gutefrage_signups_email_key ON public.gutefrage_signups (lower(email));
CREATE UNIQUE INDEX gutefrage_signups_token_key ON public.gutefrage_signups (confirm_token) WHERE confirm_token IS NOT NULL;

GRANT ALL ON public.gutefrage_signups TO service_role;

ALTER TABLE public.gutefrage_signups ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_gutefrage_signups_updated_at
BEFORE UPDATE ON public.gutefrage_signups
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();