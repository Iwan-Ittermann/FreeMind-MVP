# /secret — Chats als Pfeile im Graphen

Ein passwortgeschütztes Experiment-Topic unter `/secret`, das dieselbe Diskussion wie `/go` zeigt, aber alle Chats gleichzeitig als kurze Pfeile darstellt statt nur bei Mouse-over.

## Zugang

- Neue Route `/secret` mit vorgeschaltetem Passwort-Overlay (Passwort: `wonderful`).
- Nach korrekter Eingabe wird der Zugang im Browser gemerkt (localStorage), kein erneutes Fragen.
- Inhalt danach: identisch zu `/go` (echtes Event-Thema, echte Daten), nur mit dem neuen Pfeil-Rendering.

## Die Pfeil-Darstellung

Pro Chat werden zwei kurze Pfeile gezeichnet — einer an jedem Node, jeweils in Richtung des Gesprächspartners. So bleibt sichtbar, wer mit wem spricht, ohne den Graphen mit langen Linien zu überziehen.

- **Richtung**: Pfeil startet am Node und zeigt exakt auf den Partner-Node.
- **Länge = Chatlänge** (Anzahl Nachrichten beider Seiten). Skaliert komprimiert (Wurzel-Kennlinie) zwischen einer Mindestlänge (kurzer Stummel bei 1 Nachricht) und einer Maximallänge von ca. 25 % des Abstands zum Partner, hart begrenzt, damit nichts chaotisch wird. Zusätzlich Staffelung in ablesbaren Stufen, damit "länger = mehr Nachrichten" erkennbar bleibt.
- **Farbe = erhaltene Brückenpunkte in diesem Chat**, also Verständnis-Bewertung durch den Gesprächspartner × eigene Meinungsunterschieds-Bewertung. Farbskala von kühl/gedimmt (wenige Punkte) über Cyan zu warm/hell (viele Punkte); Chats ohne Bewertung bleiben neutral grau.
- **Mouse-over bleibt**: Beim Hovern eines Nodes leuchten weiterhin dieser Node und alle Partner-Nodes mit aktivem Chat auf, die zugehörigen Pfeile werden hervorgehoben; die restlichen Pfeile dimmen ab.
- **Klick auf einen Pfeil** öffnet weiterhin den jeweiligen Chat im Read-only-Modus (bestehende Logik).
- Kleine Legende unten (Länge = Gesprächslänge, Farbe = Punkte).

## Datenlage (bereits vorhanden, nur anders gerendert)

Es sind keine neuen Tabellen nötig:

- Nachrichtenanzahl pro Chat: bestehende Funktion `get_topic_chats` liefert `message_count` öffentlich.
- Gerichtete Bewertungen: bestehende Funktion `get_topic_directed_pairs` liefert `empathy` und `disagreement` je Richtung — daraus ergeben sich die erhaltenen Punkte pro Node und Chat.

## Technische Umsetzung

- **Route**: `/secret` in `src/App.tsx`, rendert `Discussion` mit neuem Prop `variant="arrows"` (Modus bleibt `real`). Passwort-Gate als eigene kleine Komponente `src/components/tt/SecretGate.tsx`.
- **Neuer Hook** `src/hooks/useChatArrows.ts`: lädt `get_topic_chats` + `get_topic_directed_pairs` für das Topic und erzeugt gerichtete Einträge `{ fromOpinionId, toOpinionId, messageCount, receivedPoints }` (Realtime-Invalidierung analog zu `useTopicData`).
- **Neue Renderer-Komponente** `src/themes/signal/SignalChatArrows.tsx`: zeichnet die Pfeile (Linie + Spitze, `marker`/Polygon) aus Node-Koordinaten; Länge/Farbe wie oben; Hover- und Klick-Handler durchgereicht.
- **Verdrahtung**: optionales Prop `chatArrows` durch `TTScreen` → `OpinionGraph` → `SignalRenderer`. Ist es gesetzt, werden die bisherigen `SignalEdge`-Linien ausgeblendet und stattdessen die Pfeil-Ebene gerendert; `/go` und `/test` bleiben unverändert.
- **i18n**: Texte für Passwort-Overlay und Legende in `de.json`/`en.json`.

## Was unverändert bleibt

- Layout/Positionen der Nodes (deterministisch, keine Änderung an `tt-layout.ts`).
- Punkteberechnung, Chats, Bewertungen, `/go` und `/test`.
