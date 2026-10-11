# August-Diskussion als zweites Simulations-Datenset

## Ziel
Der Simulations-Player kann zwei Datensets abspielen: die bisherige KI-Simulation ("Social Media") und die echte August-Diskussion. Auf der Startseite, auf /wedium und auf /sim wählt man über einen kleinen Umschalter, welches Set läuft. /go bleibt unverändert (nur KI-Sim bzw. später das echte Event).

## Was der User sieht
- Kleiner Umschalter über bzw. am Player: "KI-Simulation" | "August-Diskussion" (DE/EN). Im Wedium-Look auf /wedium.
- Die August-Diskussion läuft genauso wie die bisherige Sim: beschleunigter Loop, Zeitleiste mit Uhr (Tag X / Y Uhr), Meinungen poppen auf, Nachrichten fliegen, Bewertungen werden als Pfeile sichtbar.
- Mitmachen wie bisher: Meinung abgeben und bewerten ohne E-Mail, Meinung gilt nur für die Sitzung.
- Die Auswahl bleibt pro Gerät gemerkt.
- Das echte Archiv auf /aug-test und die Endrangliste bleiben unangetastet.

## Datenset aus echten August-Daten
- Einmaliger Export der August-Diskussion (aktuell 17 Meinungen, 50 Chats, 182 Nachrichten, 102 Unterschieds- und 27 Respekt-Bewertungen) in dasselbe Timeline-Format wie die KI-Sim.
- Anonymisiert: keine Nutzer-IDs, E-Mails oder IPs; Teilnehmer werden zu nummerierten Personas. Ausgeblendete/gemeldete Inhalte und Bots werden weggelassen.
- Zeitlicher Ablauf bleibt erhalten, lange Ruhephasen werden komprimiert, damit der Loop dicht bleibt (Ziel: 72 Sim-Stunden wie die KI-Sim, damit Uhr und Tempo gleich funktionieren). Lesepausen-Logik wird übernommen.

## Ablauf
1. Exportskript erzeugt `august-timeline.json` (anonymisiert, komprimiert).
2. Eigenes Simulations-Thema für August anlegen (eigene Frage, eigene Sim-Personas), damit beide Loops parallel und unabhängig laufen und alle Besucher je Set denselben Stand sehen.
3. Replay-Funktion bekommt einen Parameter für das Datenset und spielt die passende Timeline in das passende Thema.
4. Player/Einbettung bekommt den Datenset-Parameter; Umschalter auf /, /wedium, /sim.
5. Benachrichtigungen, Mails und Statistik schließen auch das August-Sim-Thema aus.
6. Prüfung per Browser auf allen drei Seiten (Desktop + Mobil), inklusive Mitmachen.

## Technische Details
- Timeline-Format identisch zu `sim-timeline.json` (opinion, chat_open, message, difference_rating, rating); Export per Python-Skript neben `scripts/sim-timeline/`, Zeitkompression: Lücken > X Minuten auf feste Obergrenze kürzen, dann linear auf 72h skalieren.
- Neue Settings `sim_august_topic_short_code`; `sim_personas`/`sim_state` um eine Spalte `dataset` (default 'social') erweitern, Lease und Cursor je Datenset (`sim_replay_cursor_<dataset>`, `sim_replay_chats_<dataset>`). Migration additiv.
- `sim-replay` akzeptiert `{ dataset: 'social' | 'august' }` (Zod-validiert), Default 'social'.
- `is_sim_topic` und `is_open_topic` erkennen beide Sim-Themen (Verifizierung aus, Notifications aus).
- `useEventTopic` erhält Rolle `sim-august`; `EventGo`/Embed lesen `?dataset=`; `/sim?dataset=august`; Umschalter-Komponente setzt iframe-src bzw. Route-Param, gespeichert in localStorage.
- AGENTS.md-Regel: mehrere Replay-Datensets teilen einen Renderer und eine Replay-Funktion, getrennt nur durch Thema und Cursor.
