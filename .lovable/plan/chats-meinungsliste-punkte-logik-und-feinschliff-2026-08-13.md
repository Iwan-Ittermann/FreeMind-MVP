# Chats, Meinungsliste, Punkte-Logik und Feinschliff

## 1. Chatliste (Tab „Chats")

- Die Liste enthält jetzt **alle Meinungen, die der Nutzer bewertet hat** — nicht nur Chats mit Nachrichten.
- Noch nicht gestartete Gespräche werden mit einem Label „Noch nicht begonnen" markiert (dezent, eigene Badge-Farbe).
- **Suchfeld** oben in der Liste: filtert über Chat-Titel, Meinungstext und letzte Nachricht.
- **Sortierung wie im Messenger**: (1) ungelesene Nachrichten, (2) begonnene Entwürfe, (3) letzte Aktivität, (4) noch nicht begonnene Gespräche nach Bewertungsdatum.
- Entwürfe: ungesendeter Text im Chat-Eingabefeld wird lokal pro Chat gespeichert, in der Liste mit „Entwurf: …" angezeigt und beim Öffnen wiederhergestellt.

## 2. KI-generierte Chat-Titel

- Jeder Chat bekommt einen kurzen, prägnanten Titel (max. ~4 Wörter), der aus **beiden** Meinungen generiert wird, z. B. „Grüne vs. Klimakosten".
- Der Titel wird einmal serverseitig erzeugt und gespeichert; danach überall verwendet (Chatliste, Chat-Kopfzeile, minimierte Chats).
- Fallback, solange kein Titel existiert: der bisherige Meinungstext-Auszug.
- Erzeugung über Lovable AI (kein eigener Schlüssel nötig), Sprache Deutsch.

## 3. Meinungsliste (Tab „Meinungen")

- **Tippen auf eine unbewertete Meinung** öffnet ein Popup mit der 5-stufigen Meinungsunterschied-Skala (0–100 %) plus „OK".
- Nach dem Speichern zeigt der Listeneintrag **die eigene Bewertung** an (Prozent + Farbe) — ebenso im Meinungs-Panel am Graph.
- Bei bewerteten Meinungen erscheint ein **Chat-Button** mit Zustand: „Diskutieren" (noch nicht begonnen) oder „Chat öffnen" (läuft bereits).
- **Punktzahl** (Brückenpunkte) wird pro Meinung angezeigt.
- **Sortierung** umschaltbar: Meinungsunterschied · Neueste · Höchste Punktzahl.
- **Suchfeld** über der Liste.

## 4. Neue Punkte-Berechnung (gerichtet)

Bisher: Durchschnitt der Bewertungen beider Seiten → beide Knoten bekommen dieselben Punkte pro Paar.

Neu: **Jeder Knoten erhält Punkte ausschließlich aus der Bewertung des Gegenübers.**

- Punkte für Alice aus dem Paar (Bob → Alice) = Respekt(Bob→Alice) × Meinungsunterschied(Bob→Alice).
- Beispiel: Bob bewertet 100 % Unterschied und 50 Respekt → Alice erhält 5.000. Bewertet Alice Bob mit 0/0, erhält Bob 0.
- Die bestehende Dämpfung der ersten beiden Bewertungen bleibt unverändert.
- **Determinismus**: Kanten und Winkelberechnung bleiben weiterhin symmetrisch (gemittelter Unterschied), nur der Radius wird gerichtet berechnet; alle Eingangsdaten werden vor der Berechnung stabil sortiert, damit die Positionen auf jedem Client identisch sind.
- Fehlt eine Gegenbewertung, gibt es für diesen Knoten aus diesem Paar keine Punkte (Paar wird für ihn nicht gezählt) — Knoten ohne jede Gegenbewertung behalten die Startpunkte.

## 5. Kleinigkeiten

- Der Hinweis für nicht registrierte Nutzer bekommt einen Link „Ich habe schon eine Passphrase" der direkt das Login-Feld im Einstellungs-Panel öffnet.
- „Ihre Meinung" / „Deine Meinung" im Chatfenster werden über i18n-Schlüssel ausgegeben (aktuell teils fest englisch).

## Technische Umsetzung

- **DB**: `chats.title text` (nullable) ergänzen; neue Funktion `get_topic_directed_pairs(_topic_id)` liefert pro Richtung `rater_opinion_id, target_opinion_id, empathy, disagreement` (Respekt aus `chat_ratings` über `rater_id` → Meinung des Nutzers, Unterschied aus `opinion_ratings`). GRANTs für `anon`/`authenticated` wie bei den bestehenden Graph-Funktionen.
- **Edge Function** `generate-chat-title`: nimmt Chat-ID, liest beide Meinungen, generiert per Lovable AI einen Kurztitel, schreibt ihn nach `chats.title` (idempotent).
- **Frontend**:
  - `src/hooks/useTTChats.ts`: bewertete-aber-chatlose Meinungen einbeziehen, Titel, Ungelesen-Zähler und Entwürfe mergen, Sortierlogik.
  - neuer Hook `useChatDrafts` (localStorage) + Anbindung im Chat-Eingabefeld.
  - `src/components/tt/TTSideTabs.tsx`: Suchfelder, Sortier-Umschalter, Badges, Rating-Popup-Anbindung.
  - neues `TTRatingDialog.tsx` (Popup mit 5-Stufen-Skala, nutzt `useDisagreementRating.saveNow`).
  - `src/lib/freemind-layout.ts` / `src/lib/tt-layout.ts`: `calculateFreeMindScore` auf gerichtete Bewertungen umstellen (neuer Parameter mit gerichteten Paaren), symmetrische Winkel unverändert.
  - `src/hooks/useTopicData.ts`: gerichtete Paare zusätzlich laden und im Layout durchreichen.
  - `TTGateOverlay.tsx` + `TTHeader.tsx`: Event/State zum Öffnen des Login-Bereichs.
  - `ChatBubble.tsx`, `EmbeddedChatView.tsx`, `de.json`/`en.json`: i18n-Schlüssel ergänzen.
