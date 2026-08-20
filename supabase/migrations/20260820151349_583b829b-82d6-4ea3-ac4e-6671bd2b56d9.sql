INSERT INTO public.email_templates (key, subject, heading, body_md) VALUES
('nudge-rate',
 'Deine Meinung steht — jetzt bewerten',
 'Jetzt bewerten',
 'Deine Meinung ist im Kreis. Es fehlt nur noch ein Schritt: bewerte drei andere Meinungen.

Dauert eine Minute — und zeigt dir, wer dir wirklich widerspricht.

[Jetzt bewerten]({{goUrl}})'),
('nudge-chat',
 'Du hast bewertet — jetzt diskutieren',
 'Jetzt diskutieren',
 'Bewertet ist erledigt. Jetzt kommt der Teil, der zählt: schreib eine Nachricht an jemanden, der anders denkt.

Ein Satz reicht für den Anfang.

[Diskussion starten]({{goUrl}})')
ON CONFLICT (key) DO NOTHING;