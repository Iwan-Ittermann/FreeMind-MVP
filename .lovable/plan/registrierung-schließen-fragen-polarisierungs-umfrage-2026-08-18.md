# Registrierung schließen, /fragen, Polarisierungs-Umfrage

## 1. Registrierung endet mit Diskussionsstart

- Server: `signup-request` behandelt die Registrierung als geschlossen, sobald `discussion_open_at` erreicht ist (bestehendes `registration_cutoff_at` bleibt als optionaler früherer Cutoff wirksam). Neue Anmeldungen und neue Bestätigungslinks werden ab dann mit `status: "closed"` abgelehnt.
- Landing (`/`):
  - Über dem Formular erscheint ein Hinweis-Banner: "Die Diskussion hat begonnen — die Registrierung ist geschlossen." plus Link "Jetzt zuschauen".
  - Das E-Mail-Formular wird deaktiviert; der Hero-Link "Jetzt registrieren" und der Formular-Button werden zu **"Jetzt zuschauen"** und verlinken auf `/go`.
  - Vor dem Start bleibt alles unverändert.

## 2. /faq wird /fragen + Fragen-Formular

- Route `/fragen` (alte `/faq` leitet dauerhaft dorthin um, damit alte Mails weiter funktionieren).
- Alle E-Mail-Links (`faqUrl`) zeigen künftig auf `/fragen`.
- Unter den FAQ-Einträgen ein Formular: Frage (Pflicht, max. 1000 Zeichen) + optionale E-Mail für Rückantwort. Validierung mit zod, Erfolg-/Fehler-Toast.
- Ablauf beim Absenden:
  1. Frage wird gespeichert (neue Tabelle `question_submissions`).
  2. Eine KI erzeugt einen Antwortvorschlag auf Deutsch, auf Basis der bestehenden FAQ-Einträge und des Event-Kontexts.
  3. Frage + Antwortvorschlag gehen per Mail an iwan@digitalpeacetalks.com.
- In `/admin2` neuer Abschnitt "Eingereichte Fragen": Liste mit Frage, KI-Antwortvorschlag (editierbar), Buttons "Als FAQ veröffentlichen" und "Löschen".

## 3. Passphrase-Block im Settings-Panel entfernen

- Der Block "Deine Passphrase" inkl. Kopieren/Download entfällt vollständig — auch für eingeloggte Nutzer. Login bzw. Logout bleiben.

## 4. Polarisierungs-Umfrage auf /go

- Zwei Slider (0–100, kein Vorgabewert; erst nach Berühren aktiv):
  - "Wie fühlst du dich gegenüber der Partei, die du am wenigsten magst?"
  - "Wie fühlst du dich gegenüber der Partei, die du am meisten magst?"
  - Beschriftung: 0 = sehr negativ, 100 = sehr positiv. Überspringen möglich.
- **Welle 1**: erscheint direkt nachdem die Meinung im echten Thema (`/go`) abgegeben wurde.
- **Welle 2**: erscheint am letzten Tag der Diskussion. Dafür neue Admin-Einstellung `discussion_end_at`; die Umfrage wird ab (Enddatum − 24 h) einmalig angezeigt, wieder ohne Vorbelegung.
- Jede Welle wird pro Nutzer nur einmal gefragt; Antworten sind für den Nutzer selbst und für Admins sichtbar.
- In `/admin2` eine kleine Auswertung: Teilnahmen und Mittelwerte je Welle.

## Technische Details

- Neue Tabellen (mit GRANTs + RLS):
  - `question_submissions` (question, email, ai_draft, status, created_at) — Insert nur über Edge Function/Service-Role, Lesen nur Admins.
  - `polarization_responses` (user_id, wave, least_liked_score, most_liked_score, created_at, unique(user_id, wave)) — eigene Zeilen einfügen/lesen, Admins lesen alle.
- Neue Edge Function `submit-question`: Validierung, Speichern, KI-Entwurf über Lovable AI (`google/gemini-3-flash`), Versand via `send-transactional-email` mit neuer Vorlage `question-submitted`.
- `useEventConfig` bekommt `discussion_end_at`; `EventPhasePanel` erhält das Feld.
- Neue Komponente `TTPolarizationPoll.tsx`, eingebunden in `Discussion.tsx` (nur `mode="real"`).
- i18n-Keys (DE/EN) für Umfrage, Fragen-Formular und Registrierungs-Hinweis.
