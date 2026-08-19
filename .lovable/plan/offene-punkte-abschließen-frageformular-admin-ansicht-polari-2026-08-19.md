# Offene Punkte abschließen: Frageformular, Admin-Ansicht, Polarisierungs-Umfrage

Bereits erledigt: der App.tsx-Importfix (`/fragen` aktiv, `/faq` leitet um) sowie die Datenbanktabellen `question_submissions` und `polarization_responses` (inkl. RLS und GRANTs).

## 1. Frageformular auf /fragen

- Unter den FAQ-Einträgen ein Formular im gleichen Look wie `/`: Frage (Pflicht, max. 1000 Zeichen) + optionale E-Mail für die Rückantwort, Validierung mit zod, Erfolg-/Fehler-Toast.
- Absenden ruft eine neue Edge Function `submit-question` auf:
  1. Validierung serverseitig, Speichern in `question_submissions`.
  2. KI erzeugt einen deutschen Antwortvorschlag auf Basis der bestehenden FAQ-Einträge (Lovable AI, `google/gemini-3-flash`).
  3. Frage + Vorschlag gehen per Mail an iwan@digitalpeacetalks.com über `send-transactional-email` mit neuer Vorlage `question-submitted`.
- Einfache Missbrauchsbremse: max. 5 Einsendungen pro IP pro Stunde.

## 2. Eingereichte Fragen in /admin2

- Neuer einklappbarer Abschnitt „Eingereichte Fragen“: Liste mit Frage, optionaler E-Mail, Datum und editierbarem KI-Antwortvorschlag.
- Buttons „Als FAQ veröffentlichen“ (legt einen `faq_items`-Eintrag an und markiert die Einsendung als erledigt) und „Löschen“.
- Datenzugriff läuft wie die übrigen Admin-Daten über `admin2-overview` bzw. eine passwortgeschützte Admin-Aktion.

## 3. Polarisierungs-Umfrage auf /go (zwei Wellen)

- Neue Komponente `TTPolarizationPoll` mit zwei Slidern (0–100, ohne Vorgabewert, erst nach Berühren aktiv):
  - „Wie fühlst du dich gegenüber der Partei, die du am wenigsten magst?“
  - „Wie fühlst du dich gegenüber der Partei, die du am meisten magst?“
  - Beschriftung 0 = sehr negativ, 100 = sehr positiv; „Überspringen“ möglich.
- Welle 1: direkt nach Abgabe der Meinung im echten Thema (`/go`, `mode="real"`).
- Welle 2: am letzten Diskussionstag — sichtbar ab (Enddatum − 24 h). Dafür neue Admin-Einstellung `discussion_end_at`.
- Jede Welle wird pro Nutzer nur einmal gefragt (unique(user_id, wave)); übersprungene Wellen werden mit leeren Werten gespeichert, damit nicht erneut gefragt wird.
- In `/admin2` eine kleine Auswertung: Teilnahmen und Mittelwerte je Welle.

## Technische Details

- Neue Edge Function `supabase/functions/submit-question/index.ts` (public, service-role Insert).
- Neue Vorlage `question-submitted.tsx` + Eintrag in `transactional-email-templates/registry.ts`.
- `useEventConfig`: `discussion_end_at` in `EVENT_SETTING_KEYS` und `EventConfig.discussionEndAt`; neues Feld in `EventPhasePanel`.
- Neue Komponente `src/components/tt/TTPolarizationPoll.tsx`, eingebunden in `src/pages/Discussion.tsx` nur für `mode="real"`.
- `src/pages/Fragen.tsx`: Formular + Absende-Logik.
- `src/pages/Admin2.tsx`: Abschnitte für Fragen und Umfrage-Auswertung.
- i18n-Keys (DE/EN) für Umfrage, Formular und Toasts.
