# Stream-Tab: Spiral-Auswahl (Schritt 1: Mechanik, Design folgt)

## Idee in einem Satz
Eine Spirale über dem Graphen legt fest, welcher Node gerade im Stream steht. Sie startet in der Mitte, dreht sich durch alle Cluster und wandert über die Punktstufen nach außen. Im negativen Bereich endet sie. Alle sehen im selben Moment denselben Node.

## Was gebaut wird
1. **Vierter Tab „Stream“** neben Meinungen, Graph und Chats, mobil und am Desktop. Vorerst zeigt er schlicht: den aktuell gefeaturten Node, seinen besten Chat (read only, genau wie heute) und darunter die bisherigen Einträge dieses Umlaufs.
2. **Die Spirale im Graphen**: eine gepunktete Spirale, der aktuelle Punkt leuchtet, und eine feine Linie verbindet ihn mit dem gefeaturten Node. Ein Umschalter im Zahnrad-Menü blendet sie aus.
3. **Echtzeit-Takt**: Alle X Minuten springt der Fokus zum nächsten Punkt. Ein kleiner Countdown zeigt, wann es weitergeht.

## Auswahlregeln
- **Kandidaten**: nur Nodes mit Punkten ≥ 0 und mindestens einem Chat, in dem beide geschrieben haben. Nodes im negativen Bereich sind ausgeschlossen, dort endet die Spirale.
- **Anzahl der Punkte**: N = Anzahl der Kandidaten, also genau ein Punkt pro Node und Umlauf.
- **Form**: eine archimedische Spirale von der Mitte bis zum Ring „0 Punkte“. Wie viele Windungen sie hat, hängt von N ab, zum Beispiel ⌈√N / 2⌉, mindestens 1. So wird bei vielen Nodes jede Windung dichter.
- **Zuordnung**: Für jeden Spiralpunkt, der Reihe nach, wird der nächstgelegene Node genommen, der in diesem Umlauf noch nicht dran war.
- **Welcher Chat**: pro Node der Chat mit dem höchsten Wert aus gegenseitigem Respekt × Differenz.
- **Rhythmus**: Taktlänge = Umlaufdauer / N. Die Umlaufdauer ist zunächst 24 h und im Admin einstellbar. Ein Takt dauert mindestens 5 und höchstens 120 Minuten.
- **Rotation**: Mit jedem Umlauf dreht sich der Startwinkel der Spirale um den Goldenen Winkel weiter. Die Mitte bleibt der Start, aber die Reihenfolge danach wechselt.

## Stabilität (alle sehen dasselbe)
- Die Reihenfolge wird **zu Beginn jedes Umlaufs einmal festgehalten** und gespeichert. Wer zuerst kommt, schreibt sie. Alle anderen lesen die gespeicherte Version. So springt nichts, wenn sich der Graph mitten im Umlauf bewegt.
- Welcher Punkt gerade dran ist, ergibt sich rein aus der Uhrzeit und dem Startzeitpunkt. Es gibt keinen Hintergrund-Job.
- Neue Nodes, die mitten im Umlauf dazukommen, erscheinen erst im nächsten.

## Technische Details
- Neue Tabelle `stream_cycles` (topic_id, cycle_index, started_at, tick_ms, spiral_offset, order uuid[]), eindeutig pro (topic_id, cycle_index). Öffentlich lesbar. Geschrieben wird nur über die Security-Definer-RPC `ensure_stream_cycle(topic, index, order)`, die `on conflict do nothing` ausführt, dazu GRANTs und RLS.
- Die Mathematik liegt als reine Funktionen in `src/lib/stream-spiral.ts`: Spiralpunkte, Zuordnung ohne Wiederholung, aktueller Index. Unit-Tests prüfen die Determinismus-Fälle.
- Hook `useStreamFocus(topicId)`: nimmt die Layout-Positionen aus `calculateTTLayout`, stellt den Umlauf sicher und liefert den aktuellen Node und den Countdown.
- Chat-Auswahl über das vorhandene `get_topic_chats` und die directed pairs. Die Inhalte kommen über `get_readonly_chat_messages`, es entsteht also keine neue Freigabe.
- Die Spirale wird als SVG-Ebene im Signal-Renderer gezeichnet, ohne sich mit den Nodes zu überlappen (No-Overlap-Regel).
- Alle Texte sind in DE und EN über `t()` angelegt.

## Nicht in diesem Schritt
Das eigentliche Design der Stream-Karten, Push-Mitteilungen („Du bist im Stream“) und eine Feinjustierung der Spirale im negativen Bereich.
