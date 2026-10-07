# Stream-Navigation und lebendige Sim-Visualisierung

## Ziel
Die untere Leiste zeigt wieder nur **Meinungen, Graph und Chats**. Stream und Impressum ziehen ins Zahnrad-Menü. Gleichzeitig wird die laufende Simulation direkt im Graph verständlich: neue Meinungen, Nachrichten und Bewertungen erscheinen als kurze, lesbare Ereignisse, ohne den Graph zu überladen.

## Umsetzung

### 1. Navigation auf drei Tabs reduzieren
- Den Stream-Tab aus der unteren Leiste entfernen; Reihenfolge wieder **Meinungen – Graph – Chats**.
- Im Zahnrad-Menü einen klaren Eintrag **„Stream öffnen“** ergänzen, der dieselbe bestehende Stream-Ansicht öffnet.
- **„Impressum“** ebenfalls ins Zahnrad-Menü verlegen und den dauerhaften Footer-Link unter dem Graph entfernen.
- Alle neuen Beschriftungen auf Deutsch und Englisch ergänzen.

### 2. Sim-Ereignisse als gemeinsame Animationsspur
- Den bestehenden Sim-Replay-Schreibpfad mit der bereits vorhandenen Graph-Animation verbinden, statt ein zweites Animationssystem aufzubauen.
- Frisch eingetroffene Replay-Ereignisse clientseitig aus dem bestätigten Replay-Fortschritt ableiten, deduplizieren und in zeitlicher Reihenfolge darstellen.
- Bestehende Echtzeit-Nachrichten und simulierte Nachrichten durch dieselben visuellen Komponenten führen.
- Gemeinsame Zeitkonstanten für Nachrichtenflug, Kantenleuchten und Ereignis-Cleanup verwenden, damit die Effekte nicht auseinanderlaufen.

### 3. Neue Meinungen sichtbar inszenieren
- Jeder neue Node erscheint für alle Betrachtenden mit der vorhandenen Stern-/Zentrumsanimation, nicht nur beim eigenen Beitrag.
- Direkt danach hängt am Node eine Sprechblase mit der neuen Meinung.
- Die Blase bleibt abhängig von der Textlänge **4–8 Sekunden** sichtbar.
- Für einen ruhigen Gesamteindruck wird der Text auf ungefähr **140 Zeichen** begrenzt, wortweise gekürzt und mehrzeilig geklemmt.
- Mehrere fast gleichzeitige Meinungen werden kurz gestaffelt, damit Blasen nicht unlesbar übereinanderliegen.

### 4. Chat-Nachrichten zwischen Nodes zeigen
- Statt eines einzelnen kurzen Punktes wandert eine kompakte Textblase entlang der betreffenden Kante vom Absender zum Gegenüber.
- Text wird knapp gekürzt; lange Nachrichten bewegen sich etwas langsamer als kurze.
- Die betroffene Kante beziehungsweise der Richtungspfeil leuchtet während des Flugs deutlich auf und klingt danach weich ab.
- Gleichzeitige Nachrichten werden auf eine begrenzte Zahl sichtbarer Animationen reduziert beziehungsweise in eine kurze Warteschlange gestellt, damit der Graph lesbar bleibt.

### 5. Bewertungen live und bleibend darstellen
- Neue Bewertungen erzeugen einen deutlichen Impuls auf dem gerichteten Pfeil:
  - **Rot** für niedrigen Respekt.
  - **Grün** für hohen Respekt.
  - Zwischenwerte erhalten eine klare Zwischenstufe, ohne einen schwer lesbaren Regenbogen.
- Fällt die Bewertung zeitlich mit der letzten Nachricht der Gegenseite zusammen, leuchtet auch diese Nachrichtenblase beziehungsweise ihr Endpunkt in derselben Farbe auf.
- Nach dem Impuls bleibt der Pfeil als ruhiges, dauerhaftes Ergebnis der Bewertung sichtbar; neue Bewertungen aktualisieren ihn live.
- Die Farblogik wird absolut skaliert, nicht relativ zum jeweils höchsten Wert im Graph, damit Rot und Grün immer dieselbe Bedeutung haben.

### 6. Visuelle Dramaturgie und Überlastungsschutz
- Ereignisse erhalten Prioritäten: **neue Meinung vor Bewertung vor Nachricht**.
- Pro Moment werden nur wenige Textblasen gezeigt; weitere Ereignisse folgen in kurzem Abstand.
- Klicks auf Nodes und Pfeile bleiben während der Animationen möglich.
- `prefers-reduced-motion` erhält eine ruhige Variante ohne Flugbewegung, aber mit sichtbaren Zustandswechseln.
- Die dünne Sim-Fortschrittslinie bleibt bestehen und konkurriert nicht mit den Ereignissen.

### 7. Vor-Event-Simulation separat danach
- Die Ablösung der Sperrbildschirme auf **/go** und **/wedium/go** wird wie gewünscht hintangestellt und nicht mit diesem ersten Umsetzungsschritt vermischt.
- In der anschließenden Etappe wird derselbe Sim-Layer eingebettet; auf **/wedium/go** bleibt dabei der Wedium-Farbverlauf, das Partnerlogo, das Wedium-Node-Icon und der reduzierte schwarz-weiße Graph erhalten.
- Event-Beiträge und Event-Chats werden dabei weiterhin sauber vom Sim-Thema getrennt.

## Sinnvolle Ergänzungen, die noch gefehlt haben
- **Ereignis-Puffer statt Animationsexplosion:** entscheidend bei 60× Tempo, damit Spitzen nicht alles gleichzeitig einblenden.
- **Priorisierung und Deduplizierung:** verhindert doppelte Effekte durch Live-Updates plus 4-Sekunden-Aktualisierung.
- **Bleibende Zustände nach dem Effekt:** Animation erklärt das Ereignis, der Pfeil zeigt anschließend dauerhaft das Ergebnis.
- **Reduzierte Bewegung:** erhält Zugänglichkeit und verhindert Unruhe auf kleinen Displays.

## Technische Leitplanken
- Bestehende Graph-, Node-, Kanten- und Nachrichten-Komponenten erweitern; keinen zweiten Sim-Renderer anlegen.
- Replay-Ereignisse anhand stabiler IDs/Cursor nur einmal animieren und niemals bei einem normalen Daten-Refresh erneut abspielen.
- Die vorhandenen Pfeile bleiben klickbar und öffnen weiterhin die zugehörige Leseansicht.
- Keine Änderungen an Stream-Auswahl, 60×-Replay-Takt, gespeicherter Timeline oder Bewertungsberechnung.

## Prüfung
- Untere Leiste auf Mobil und Desktop: exakt drei Tabs; Stream und Impressum funktionieren aus dem Zahnrad-Menü.
- Replay-Ereignisse einzeln und in Bursts prüfen: neue Meinung, kurze/lange Nachricht, niedrige/hohe Bewertung sowie zeitlich gekoppelte Nachricht + Bewertung.
- Sicherstellen, dass Animationen nach Refetch nicht doppelt laufen und eingeklappte/aktive Ansichten nicht zurückgesetzt werden.
- /sim auf Mobil und Desktop auf Lesbarkeit, Überlappungen, Klickbarkeit und reduzierte Bewegung prüfen.
