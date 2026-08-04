# Passphrase-Mail wird noch verschickt: Ursache und Fix

## Was tatsächlich passiert ist

Log für phillip.kretschmer2009@gmail.com (heute):

```text
13:09:00  signup-confirm     (DOI-Mail)      sent
13:09:14  confirmed_at gesetzt
13:09:15  signup-welcome                     sent
13:09:50  signup-passphrase                  sent   <-- unerwünscht
```

Die Passphrase-Mail kam **nicht** aus `signup-confirm` (dort ist der Versand
korrekt entfernt), sondern aus `signup-request`: Der Nutzer hat nach der
Bestätigung seine E-Mail auf der Startseite noch einmal eingetragen. In
`signup-request` gibt es einen Zweig „bereits bestätigt + Passphrase vorhanden
→ Passphrase-Mail erneut senden" (gedrosselt), der genau das ausgelöst und
`last_passphrase_sent_at` gesetzt hat.

## Fix

In `signup-request/index.ts` den automatischen Passphrase-Resend entfernen:

- Bei bereits bestätigter Adresse keine Mail mehr senden, sondern
  `{ status: "already_confirmed" }` zurückgeben (gleicher Zweig wie bei
  bestätigten Rows ohne Passphrase).
- `sendPassphraseEmail`, den Throttle-Konstanten-Gebrauch und das Update von
  `last_passphrase_sent_at` in dieser Funktion entfernen.
- Manueller Resend in /admin2 bleibt unverändert als Fallback.

Frontend-Prüfung: falls `Landing.tsx` auf `status: "resent"` einen Text wie
„Passphrase erneut gesendet" zeigt, wird die Meldung auf den
`already_confirmed`-Fall angepasst (Hinweis: Zugang bereits bestätigt,
Passphrase kommt mit der Prepare-Mail bzw. per Anfrage).

Danach `signup-request` neu deployen.
