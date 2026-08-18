# Tagesbericht, Mail-Aufräumen und Settings-Panel

## 1. "Prepare"-Mail entfernen

Die Kampagne "Prepare (19.08.2026)" verschwindet komplett:

- Aus der Kampagnen-Liste entfernen, damit sie nicht mehr fällig wird.
- Spalte und Aktions-Eintrag in `/admin2` fallen weg (die restlichen Spalten bleiben unverändert).
- Vorlagen-Editor zeigt sie nicht mehr an.

Wichtig: Die Passphrase wurde bisher mit dieser Mail ausgeliefert. Damit registrierte Nutzer ihre Passphrase weiterhin bekommen, wandert der Passphrase-Platzhalter in die "Soft launch"-Mail (Nr. 4 der bisherigen Reihenfolge). Bereits gesendete Prepare-Mails bleiben in der Historie erhalten.

## 2. Täglicher Bericht (`/bericht` + Mail)

**Generierung** — einmal pro Tag (23:30 Berlin, per Cron) wird ein Bericht für den vergangenen Tag erzeugt:

- Kennzahlen: neue Meinungen, neue Chats, Nachrichten, aktivste Diskussionen, Top-Nodes nach Verständnis-Punkten.
- Ein KI-Gesamttext (Lovable AI) über alle Diskussionen des Tages: Hauptstreitpunkte, wo Annäherung entstand, auffällige Argumente — mit kurzen Original-Zitaten aus Chatnachrichten.
- Nur sichtbare (nicht moderierte) Meinungen und Nachrichten fließen ein; Zitate werden ohne Klarnamen, nur mit Meinungs-Kurzlabel ausgewiesen.
- Ergebnis wird als Bericht-Datensatz gespeichert (Datum, Titel, Markdown-Text, Kennzahlen), damit `/bericht` und Mail dieselbe Quelle nutzen.

**Neue Route `/bericht`** — öffentliche Seite im Stil der bestehenden Seiten (`/sogehts`, `/faq`):

- Liste aller Tagesberichte, neuester oben und aufgeklappt, ältere einklappbar.
- Kennzahlen als kompakte Zahlenreihe, darunter der Bericht-Text.
- Link im Footer neben Impressum/FAQ.

**Mailversand — Opt-in über die Glocke:**

- Im Benachrichtigungs-Panel (Glocken-Dropdown) kommt ein neuer Schalter "Täglicher Bericht per E-Mail".
- Der Schalter ist nur für eingeloggte, verifizierte Teilnehmer aktiv (nur diese haben eine hinterlegte E-Mail); sonst erscheint der Hinweis, dass Registrierung/Login nötig ist.
- Die Einstellung wird serverseitig am Registrierungs-Datensatz gespeichert, nicht nur lokal.
- Nach der Generierung geht der Bericht als E-Mail nur an die Adressen mit aktivem Opt-in (Abmeldelink wie bei allen Mails automatisch).
- In `/admin2`: eigene Bericht-Vorlage editierbar, Übersicht der erzeugten Berichte und ein Knopf zum manuellen Neu-Versenden bzw. Neu-Generieren eines Tages.

## 3. Settings-Panel

- Das Element "Deine Passphrase" (inkl. Auge/Kopieren/Download) wird nur noch für eingeloggte Nutzer gerendert. Ohne Login: kein Passphrase-Block.
- Für eingeloggte Nutzer ersetzt ein **Logout**-Button den Link "Du hast bereits eine Passphrase?" samt Login-Formular.
- Für ausgeloggte Nutzer bleibt der Login-Bereich wie bisher erreichbar (Link + Formular).
- Beide Texte laufen über i18n (DE/EN).

## Technische Umsetzung

- Neue Tabelle `daily_reports` (Datum unique, Titel, Body-Markdown, Kennzahlen-JSON, generiert-am) mit GRANTs, RLS: `SELECT` für `anon`/`authenticated`, Schreiben nur `service_role`.
- Neue Spalte `daily_report_opt_in boolean default false` auf `signups`; Umschalten über eine `SECURITY DEFINER`-RPC, die nur den eigenen (über `auth_user_id` verknüpften) Datensatz ändert.
- Neue Edge Function `generate-daily-report`: liest Tagesdaten mit Service-Role, ruft die Lovable-AI-Gateway an, schreibt `daily_reports` und stellt die Mails über `send-transactional-email` mit Idempotenz-Schlüssel `bericht-<datum>-<empfänger>` in die Queue.
- pg_cron-Job (23:30 Berlin) ruft die Function per `net.http_post` auf; per Insert-Tool eingerichtet, nicht per Migration.
- Neues Template `daily-report.tsx` in `_shared/transactional-email-templates/` + Registry-Eintrag; Text aus der editierbaren Vorlage in `email_templates`.
- Frontend: `src/pages/Bericht.tsx`, Route in `App.tsx`, Hook `useDailyReports`, Schalter in `TTHeader.tsx` (Glocken-Dropdown), Anpassungen im Account-Dropdown von `TTHeader.tsx`.
- `supabase/functions/_shared/campaigns.ts`, `Admin2.tsx` und `admin2-overview` verlieren `campaign-prepare`; Passphrase-Platzhalter zieht in `campaign-soft-launch`.
