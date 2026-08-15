ALTER TABLE public.campaign_sends
  ADD COLUMN IF NOT EXISTS opened_at timestamptz,
  ADD COLUMN IF NOT EXISTS open_count integer NOT NULL DEFAULT 0;

INSERT INTO public.email_templates (key, subject, heading, body_md)
VALUES (
  'campaign-sogehts',
  'So funktioniert freemind',
  'So funktioniert freemind',
  E'Bei freemind beginnt alles mit einem Kreis. Auf diesem Kreis stehen alle Meinungen, die mitmachen.\n\nKlicke eine Meinung an und bewerte, wie groß eure Meinungsverschiedenheit ist. Je unterschiedlicher zwei Meinungen sind, desto weiter stehen sie sich im Kreis gegenüber.\n\nDu bekommst Punkte, wenn du mit Menschen chattest, die anders denken als du – und dein Gegenüber das Gespräch gut bewertet.\n\n**Ein Beispiel:** Meinungsunterschied 10 × Chat-Bewertung 5 = **50 Punkte**.\n\nDie fünf Menschen mit den meisten Punkten erhalten am Ende ein Losungswort. Damit können sie mir ihre PayPal-Adresse oder Kontoverbindung schicken und anschließend öffentlich bestätigen, dass sie ihr Preisgeld erhalten haben.\n\n[So geht''s im Detail ansehen]({{sogehtsUrl}})\n\n[Jetzt mitdiskutieren]({{goUrl}})'
)
ON CONFLICT (key) DO NOTHING;