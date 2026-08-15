# "So geht's" Mail + Öffnungs-Tracking

Eine neue Kampagnen-Mail mit dem Text von `/sogehts`, editierbar in `/admin2`, nur manuell auslösbar — plus Tracking, wer die Mail geöffnet hat (Doppel-Häkchen in der Tabelle).

## Die Mail

- Neuer Kampagnen-Key `campaign-sogehts`, Anzeigename "So geht's".
- Kein Datum, kein automatischer Versand: die Mail wird ausschließlich über den Button in `/admin2` verschickt (einzeln pro Nutzer oder an alle bestätigten Anmeldungen, die sie noch nicht bekommen haben).
- Inhalt (in `/admin2` frei editierbar, Betreff + Überschrift + Text):
  - Betreff: "So funktioniert freemind"
  - Bei freemind beginnt alles mit einem Kreis. Auf diesem Kreis stehen alle Meinungen, die mitmachen.
  - Klicke eine Meinung an und bewerte, wie groß eure Meinungsverschiedenheit ist.
  - Je unterschiedlicher zwei Meinungen sind, desto weiter stehen sie sich im Kreis gegenüber.
  - Du bekommst Punkte, wenn du mit Menschen chattest, die anders denken als du – und dein Gegenüber das Gespräch gut bewertet.
  - Beispiel: Meinungsunterschied 10 × Chat-Bewertung 5 = 50 Punkte.
  - Die fünf Menschen mit den meisten Punkten erhalten am Ende ein Losungswort (PayPal/Konto, öffentliche Bestätigung).
  - Links auf `/go` und `/sogehts` ("So geht's ansehen").
- Kein Bild im Mailtext (Screenshots blocken viele Clients); statt dessen der Link auf `/sogehts`.

## Öffnungs-Tracking

- Jede versendete Kampagnen-Mail enthält ein unsichtbares 1x1-Pixel mit Kampagnen-Key + Anmelde-ID.
- Lädt der Mail-Client das Pixel, wird der Zeitpunkt der ersten Öffnung gespeichert.
- Gilt für alle Kampagnen-Mails, nicht nur für die neue.
- Grenze der Genauigkeit: Clients, die Bilder blockieren (häufig bei Gmail/Outlook-Voreinstellungen), zählen nicht als geöffnet. Die Zahl ist also eine Untergrenze.

## Anzeige in /admin2

- Neue Spalte "Geht's" in der Häkchen-Matrix.
- Ein Häkchen = gesendet, Doppel-Häkchen = geöffnet (mit Datum im Tooltip).
- In der Mail-Liste oben: "x gesendet · y geöffnet" pro Kampagne.
- Manueller Versand über den bestehenden "Jetzt senden"-Button, sowie über das Aktionsmenü einer einzelnen Zeile.

## Technische Umsetzung

- `campaigns.ts`: `dueAt` optional; `campaign-sogehts` ohne `dueAt` wird vom Cron-Lauf ignoriert und nur bei explizitem `campaignKey` gesendet.
- `campaign.tsx`: neues `sogehtsTemplate`; im Mail-Layout ein `<Img>`-Pixel, wenn `trackingUrl` gesetzt ist. Registrierung in `transactional-email-templates/registry.ts`.
- Migration: `campaign_sends.opened_at timestamptz`, `open_count int default 0`; Grants/RLS bleiben service-role-only.
- Neue Edge Function `email-open` (öffentlich, ohne JWT): liest `c` (campaign key) und `s` (signup id), setzt `opened_at` beim ersten Aufruf, erhöht `open_count`, antwortet immer mit einem transparenten 1x1-GIF und `Cache-Control: no-store`. Keine Datenrückgabe, keine Fehlerdetails.
- `send-campaign-emails/index.ts`: `trackingUrl` = `<functions-url>/email-open?c=<key>&s=<signupId>` in `templateData`; Reihenfolge bleibt "senden → `campaign_sends` upsert".
- `admin2-overview/index.ts`: `campaign-sogehts` in `TEMPLATE_KEYS` und `TRACKED_TEMPLATES`; `campaign_stats` liefert zusätzlich Öffnungszahlen; Matrix bekommt pro Kampagne den Status `opened`.
- `src/pages/Admin2.tsx`: Template-Metadaten + Matrix-Spalte + Doppel-Häkchen-Rendering; Seed-Text der Mail als Fallback im Editor.
- Edge Functions nach der Änderung deployen (`email-open`, `send-campaign-emails`, `admin2-overview`, `send-transactional-email`).
