
-- 1. Editable email templates table
CREATE TABLE public.email_templates (
  key text PRIMARY KEY,
  subject text NOT NULL,
  heading text NOT NULL,
  body_md text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.email_templates TO service_role;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
-- No public policies: admin-only via service role in edge functions.

CREATE OR REPLACE FUNCTION public.email_templates_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
CREATE TRIGGER email_templates_updated_at
BEFORE UPDATE ON public.email_templates
FOR EACH ROW EXECUTE FUNCTION public.email_templates_touch_updated_at();

-- Seed with current German copy
INSERT INTO public.email_templates (key, subject, heading, body_md) VALUES
('signup-confirm',
 'Bestätige deine Anmeldung bei freemind',
 'Bestätige deine Anmeldung',
 'Klick auf den Button, um deine Anmeldung bei freemind abzuschließen. Erst danach bist du wirklich dabei.

[Anmeldung bestätigen]({{confirmUrl}})

Falls der Button nicht funktioniert, kopiere diesen Link in deinen Browser:
{{confirmUrl}}

Der Link ist 48 Stunden gültig. Falls du dich nicht angemeldet hast, ignoriere diese E-Mail einfach.'),
('signup-passphrase',
 'Deine Passphrase für freemind',
 'Deine Passphrase',
 'Willkommen bei freemind! Mit dieser Passphrase nimmst du an der Diskussion teil. Sie ist an deine E-Mail-Adresse gebunden — bewahre sie sicher auf.

`{{passphrase}}`

Öffne die Diskussion und gib die Passphrase ein, wenn du deine Meinung teilst, chattest oder bewertest:

[{{appUrl}}]({{appUrl}})

Solltest du deine Passphrase verlieren, kannst du sie über die Anmeldeseite mit derselben E-Mail-Adresse erneut anfordern — wir senden dir dann dieselbe Passphrase.');

-- 2. Ban list
CREATE TABLE public.banned_emails (
  email text PRIMARY KEY,
  banned_at timestamptz NOT NULL DEFAULT now(),
  reason text
);
GRANT ALL ON public.banned_emails TO service_role;
ALTER TABLE public.banned_emails ENABLE ROW LEVEL SECURITY;

-- 3. IP logging column
ALTER TABLE public.signups ADD COLUMN IF NOT EXISTS signup_ip inet;
