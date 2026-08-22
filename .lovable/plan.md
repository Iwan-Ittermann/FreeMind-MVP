# Kampagnen-Mails näher am Zieltermin versenden

## Ausgangslage (geprüft)

- Die Mail "Start today!" (`campaign-start`) ist fällig ab 00:01 Berlin (22:01 UTC).
- Der Versand-Job läuft nur alle 15 Minuten (zu :00, :15, :30, :45). Der erste Lauf nach der Fälligkeit ist 00:15 Berlin — die Mail geht also ca. 14 Minuten zu spät raus.
- Empfängerkreis: 38 bestätigte Anmeldungen, bisher 0 Sends für diese Kampagne. Der Job läuft fehlerfrei.

## Vorschlag

Den Takt des Versand-Jobs von 15 auf 5 Minuten verkürzen. Damit gehen alle datierten Kampagnen künftig maximal ~5 Minuten nach ihrem Zieltermin raus (heute Nacht: 00:05 statt 00:15).

Zusätzlich heute Nacht nichts manuell auslösen — der Job übernimmt den Versand automatisch.

## Auswirkungen

- Keine doppelten Mails: pro Empfänger und Kampagne wird der Versand protokolliert, bereits versendete Empfänger werden übersprungen.
- Nudge-Mails bleiben unverändert (eigene 24-Stunden-Sperre pro Empfänger).
- Keine Änderungen an Texten, Empfängerlogik oder App-Oberfläche.

## Technische Details

- Zeitplan des geplanten Jobs `send-campaign-emails` von `*/15 * * * *` auf `*/5 * * * *` ändern (Neuplanung des bestehenden Jobs, gleiche Aufruf-URL und Header).
- Keine Code- oder Schema-Änderungen nötig; `supabase/functions/_shared/campaigns.ts` bleibt unverändert.
