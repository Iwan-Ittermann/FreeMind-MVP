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
- **Zuordnung, live**: Für den aktuell „heißen“ Spiralpunkt wird bei jeder Aktualisierung neu ausgewertet, welcher Node ihm am nächsten liegt. Neu dazugekommene Nodes werden sofort mit bedacht, sie müssen nicht auf den nächsten Umlauf warten. Schon gefeaturte Nodes werden pro Umlauf nicht wiederholt: der nächstgelegene bereits gezeigte Node zählt nicht, sondern der nächste noch nicht gezeigte.
- **Welcher Chat**: pro Node der Chat mit dem höchsten Wert aus gegenseitigem Respekt × Differenz.
- **Rhythmus**: Taktlänge = Umlaufdauer / N. Die Umlaufdauer ist zunächst 24 h und im Admin einstellbar. Ein Takt dauert mindestens 5 und höchstens 120 Minuten.
- **Rotation**: Mit jedem Umlauf dreht sich der Startwinkel der Spirale um den Goldenen Winkel weiter. Die Mitte bleibt der Start, aber die Reihenfolge danach wechselt.

## Stabilität (alle sehen dasselbe)
- Es gibt **keine gespeicherte Reihenfolge**. Welcher Spiralpunkt gerade dran ist, ergibt sich rein aus Uhrzeit und Startzeitpunkt. Welcher Node ihm am nächsten liegt, ergibt sich aus den aktuellen Positionen. Beides ist deterministisch, also kommen alle Betrachter auf dasselbe Ergebnis. Es gibt keinen Hintergrund-Job und keine neue Tabelle.
- Bewegt sich der Graph, weil neue Bewertungen eintreffen, kann der Fokus innerhalb eines Takts zu einem anderen Node wechseln. Das ist gewollt: die Auswahl folgt immer dem aktuellen Stand. Um Springen zu mildern, wird die Auswahl nur bei den regulären Daten-Updates (alle 4 Sekunden) neu bewertet, nicht bei jeder Bildschirm-Änderung.
- Neue Nodes, die die Kandidatenregeln erfüllen (Punkte ≥ 0, mind. ein beidseitiger Chat), können sofort gefeatured werden.

## Technische Details
- **Keine Datenbank-Änderung nötig.** Alles wird aus vorhandenen Daten abgeleitet: Positionen aus `calculateTTLayout`, Takt aus Uhrzeit und Startzeitpunkt (Start = Zeitpunkt des Topic-Starts bzw. einer Admin-Einstellung in `app_settings`, z. B. `stream_started_at_<topicId>`, Umlaufdauer `stream_cycle_hours_<topicId>`).
- Die Mathematik liegt als reine Funktionen in `src/lib/stream-spiral.ts`: Spiralpunkte, live-Zuordnung ohne Wiederholung pro Umlauf, aktueller Index aus der Uhrzeit. Unit-Tests prüfen die Determinismus-Fälle (gleiche Eingaben → gleiche Auswahl, neue Nodes schlagen sofort zu).
- Hook `useStreamFocus(topicId)`: nimmt die Layout-Positionen aus `calculateTTLayout`, wertet bei jeder Daten-Aktualisierung neu aus und liefert den aktuellen Node, die bereits gezeigten Nodes dieses Umlaufs und den Countdown.
- Chat-Auswahl über das vorhandene `get_topic_chats` und die directed pairs. Die Inhalte kommen über `get_readonly_chat_messages`, es entsteht also keine neue Freigabe.
- Die Spirale wird als SVG-Ebene im Signal-Renderer gezeichnet, ohne sich mit den Nodes zu überlappen (No-Overlap-Regel).
- Alle Texte sind in DE und EN über `t()` angelegt.

## Nicht in diesem Schritt
Das eigentliche Design der Stream-Karten, Push-Mitteilungen („Du bist im Stream“) und eine Feinjustierung der Spirale im negativen Bereich.
