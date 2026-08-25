# Aktivierungs-Mail an registrierte User ohne Meinung

## Lage (geprüft)

- 38 bestätigte Registrierungen, alle haben schon einen Account/Passphrase.
- Nur 10 Meinungen im Event-Thema „Welche Partei wählst du – und warum?" (7mm9), 151 Chatnachrichten.
- **29 bestätigte User haben noch keine Meinung gepostet** — das ist die Zielgruppe.
- Diskussion läuft bis 29.08., 23:59 Berlin. Bleiben also 4 Tage.
- Bestehende Nudge-Mails (`nudge-rate`, `nudge-chat`) treffen diese Gruppe **nicht**: beide setzen eine vorhandene Meinung voraus. Es fehlt genau die Stufe davor.

## Vorschlag: eine Mail, drei Hebel

Reihenfolge nach Wirkung, kurz gehalten (Ziel: unter 120 Wörter Lesezeit):

1. **Verknappung mit Datum**: „Noch 4 Tage" + Enddatum. Konkret, kein „bald".
2. **Sozialer Beweis mit echten Zahlen**: „10 Meinungen, 151 Nachrichten, X Chats laufen." Zahlen werden beim Versand live aus der Datenbank eingesetzt, keine handgeschriebenen Werte.
3. **Neugier statt Appell**: 2 echte, gekürzte Zitate aus laufenden Chats des Themas (kursiv, wie im Daily Brief). Wer liest, will antworten.
4. **Preis konkret**: 5 × 50 € für die Top 5 nach Brückenpunkten — mit dem ehrlichen Hinweis, dass bei 10 Teilnehmenden die Chance real hoch ist.
5. **Minimaler nächster Schritt**: „Ein Satz reicht. 60 Sekunden." Ein einziger Button auf freemind.chat/go, Passphrase steht in der Mail (kein Login-Hindernis).
6. **Kein zweiter CTA**, keine FAQ-/So-geht's-Links im Fließtext — jede Alternative kostet Klickrate. Fußzeile bleibt wie gehabt.

Ton: sachlich-direkt, kein Motivationstalk, kein „wir würden uns freuen".

## Versand

- Morgen früh, 08:30 Berlin, einmalig, exakt an die 29 bestätigten User ohne Meinung (gebannte und Bounce-Adressen ausgeschlossen).
- Genau eine Mail pro Person, Wiederholung technisch ausgeschlossen.
- In /admin2 als eigene Vorlage editierbar (Betreff/Überschrift/Text), mit „Jetzt senden" für einen Testversand an deine Adresse zuerst.
- Danach läuft die Mail als automatischer Nudge weiter: Wer sich neu einloggt und 24 h keine Meinung postet, bekommt sie einmal — ohne dass du etwas tun musst.

## Technische Umsetzung

- Neue Kampagne `nudge-opinion` in `supabase/functions/_shared/campaigns.ts` mit `nudge: "opinion"`; `nudgeAudience()` in `send-campaign-emails` um die Stufe „hat Account, aber keine Meinung im Event-Thema" erweitern (24-h-Verzögerung ab erstem Login/`auth_user_id`, sonst ab Bestätigung).
- Die Mail braucht Live-Daten: `send-campaign-emails` reicht für diese Kampagne zusätzliche `templateData` mit Meinungszahl, Nachrichtenzahl, verbleibenden Tagen und zwei Zitaten durch. Zitat-Auswahl per Hilfsfunktion analog zur Logik in `send-daily-brief` (30–200 Zeichen, gekürzte Kern-Meinung als Absender).
- Template: `nudgeOpinionTemplate` in `_shared/transactional-email-templates/campaign.tsx` (gleicher Stil), Eintrag in `registry.ts`, Migration mit deutscher Default-Vorlage in `email_templates` (Platzhalter für Passphrase, Zahlen, Zitate).
- `admin2-overview`: Key in `TEMPLATE_KEYS` und Kampagnenliste ergänzen, damit Editor, Statistik und Sofortversand greifen.
- Einmaliger Versand morgen 08:30 Berlin: `pg_cron`-Job (06:30 UTC), der `send-campaign-emails` mit `campaignKey: "nudge-opinion"` aufruft und sich danach selbst entfernt; der reguläre 15-Minuten-Job übernimmt anschließend die laufenden Nudges.
- Danach `send-campaign-emails`, `send-transactional-email`, `admin2-overview` deployen.

## Beispieltext (Entwurf, editierbar)

Betreff: **Noch 4 Tage — deine Meinung fehlt**

> Hi! Auf freemind diskutieren gerade 10 Leute über „Welche Partei wählst du – und warum?" — 151 Nachrichten bisher. Du bist angemeldet, aber deine Meinung fehlt noch.
>
> Aus den Chats von heute:
>
> *„…"*
>
> *„…"*
>
> Am 29.08. endet die Diskussion. Die Top 5 mit den meisten Brückenpunkten bekommen je 50 €. Bei 10 Teilnehmenden ist das eine ziemlich gute Quote.
>
> Ein Satz reicht. Danach siehst du alle anderen.
>
> [Meinung posten](https://freemind.chat/go) · Passphrase: `deine-passphrase`
