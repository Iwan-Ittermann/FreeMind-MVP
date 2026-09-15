# Gutefrage-Event: Landingpage /gutefrage + Verwaltungsbereich /gutefrage/admin

Eine deutsche Landingpage, auf der sich Gutefrage.net-Nutzer für ein Live-Event im November vorregistrieren, plus ein passwortgeschützter Verwaltungsbereich. Thema der Diskussion: Wie kann die Moderation auf Gutefrage.net verbessert werden?

## Landingpage /gutefrage

Aufbau wie /wedium, nur auf Deutsch und in Gutefrage-Farben (Grün-Akzent statt Wedium-Gradient):

- Hero: freemind × Gutefrage.net, Titel, Kernsatz zum Event im November.
- Die Diskussionsfrage: "Wie kann die Moderation auf Gutefrage.net verbessert werden?"
- "Was passiert" — kurz erklärt, mit Link zu /fragen für Details.
- Öffentlicher Zähler: "X von 100 Anmeldungen" mit Fortschrittsbalken. Bei 100 wechselt der Text auf "Ziel erreicht — das Datum steht bald fest." Der Zähler zählt nur bestätigte Anmeldungen.
- Anmeldeformular (E-Mail) mit Zuständen: Link verschickt / bereits bestätigt / Fehler.
- Fußzeile mit Impressum-Link.

Kein Datum wird genannt, solange keins festgelegt ist — nur "November 2026". Sobald 100 erreicht sind, kann im Verwaltungsbereich ein Datum eingetragen werden, das dann auf der Seite erscheint.

## Bestätigungs-E-Mail

Nur eine Mail: der Bestätigungslink. Eigene, bearbeitbare Vorlage; Bestätigungsseite unter /gutefrage/confirm. Willkommensmail mit Zugangswort und Event-Mails kommen später, wenn das Datum steht.

## Verwaltungsbereich /gutefrage/admin

Gleiches Passwort wie /wedium/admin. Zeigt:

- Zähler: bestätigt / unbestätigt / gesamt, Fortschritt zu 100.
- Teilnehmerliste mit E-Mail, Anmeldezeit, Bestätigungsstatus; Bestätigungsmail erneut senden; Eintrag sperren/löschen.
- Feld für das Event-Datum (wird auf der Landingpage angezeigt, sobald gesetzt).
- Bearbeitbare Bestätigungs-Mailvorlage (Betreff, Überschrift, Text).

## Technische Umsetzung

- Neue Tabelle `public.gutefrage_signups` (E-Mail eindeutig, Bestätigungs-Token + Ablauf, `confirmed_at`, Signup-IP, Zeitstempel). RLS an, keine Client-Policies — alle Zugriffe laufen über Edge Functions mit Service Role. GRANT nur für `service_role`.
- Edge Functions, jeweils Kopien der wedium-Pendants:
  - `gutefrage-signup-request` — validiert E-Mail, prüft `banned_emails`, legt/erneuert Token, sendet Bestätigungsmail über `send-transactional-email`.
  - `gutefrage-signup-confirm` — setzt `confirmed_at`.
  - `gutefrage-stats` — öffentlicher, ungeschützter Endpunkt: nur `{ confirmed, goal: 100, eventDate }` für den Zähler.
  - `gutefrage-admin` — geschützt durch `ADMIN3_PASSWORD` (gleiches Secret wie /wedium/admin), Aktionen: Übersicht, Liste, Resend, Löschen/Sperren, Event-Datum setzen, Mailvorlage lesen/schreiben.
  - Alle vier mit `verify_jwt = false` in `supabase/config.toml`.
- Mailvorlage `gutefrage-signup-confirm` in `email_templates` (Platzhalter `{{confirmUrl}}`) plus React-Email-Template im Registry, analog `signup-confirm`.
- Event-Datum in `app_settings` als `gutefrage_event_date`.
- Neue Seiten `src/pages/Gutefrage.tsx`, `src/pages/GutefrageAdmin.tsx`, Bestätigung über die bestehende `Confirm.tsx` mit neuem `scope`-Prop; Routen `/gutefrage`, `/gutefrage/confirm`, `/gutefrage/admin` in `src/App.tsx`.
- Texte fest auf Deutsch in der Seite (kein i18n-Umschalter), Gutefrage-Grün als lokale Akzent-Tokens in `index.css`/Tailwind-Config.
- Die Diskussionsseite und das Topic für das Event kommen in einem späteren Schritt, sobald das Datum steht.
