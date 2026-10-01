# Stream im Cosmic-Look

Die gewählte Richtung „Cosmic node stream“ wird als echte Stream-Ansicht umgesetzt: links beziehungsweise oben die aktuelle Meinung als lesbarer Post, daneben beziehungsweise darunter ein kleiner Beziehungsgraph mit dem aktiven Node und seinen anklickbaren Gesprächen. Countdown und bereits veröffentlichte Stream-Einträge bleiben erhalten.

## Umsetzung

1. Den aktuellen Stream-Eintrag als Post gestalten: Meinung vollständig lesbar, klare Kennzeichnung des aktuellen Eintrags, ruhige Editorial-Typografie und die gewählte dunkle Cosmic-Palette mit blauem und warmem Licht. Keine erfundenen Likes, Kennzahlen oder Profile.
2. Einen eigenständigen, kompakten Gesprächsgraphen für genau diesen Node ergänzen: sichtbare Verbindungslinien zu allen vorhandenen gestarteten Chats; jede Verbindung und jeder Gegen-Node öffnet das entsprechende Gespräch in der bestehenden Leseansicht. Lange Gegenmeinungen bleiben über zugängliche Beschriftungen lesbar.
3. Auf breiten Ansichten Post und Node-Graph nebeneinander, auf schmalen untereinander anordnen. Die bestehende feste Telefonbreite wird **nur für die Stream-Ansicht** auf breiten Bildschirmen erweitert; Graph, andere Tabs und ihre Bedienung bleiben wie bisher. Verlaufseinträge bleiben auswählbar und zeigen ihren zugehörigen Post und Graphen, statt nur den besten Chat zu öffnen.
4. Fehlende Gespräche, Wechsel des aktuellen Eintrags und lange Texte sauber behandeln. Beide Sprachen ergänzen und reduzierte Bewegung beachten.
5. Auf Desktop und Mobil prüfen: kein Überlappen oder Abschneiden, alle Gesprächsverbindungen anklickbar, Zurück aus einem Gespräch funktioniert, Countdown und Verlauf bleiben sichtbar.

## Technische Details

- Die vorhandene Stream-Auswahl und festgeschriebene Historie bleiben unverändert; die Ansicht nutzt die bereits geladenen Meinungen und Gespräche. Keine Datenbankänderung.
- Die Stream-Darstellung erhält eigene semantische Farbtokens und lokal eingebundene Instrument Serif / Work Sans; bestehende App-Farben außerhalb des Streams bleiben unverändert.
- Der derzeitige Stream zeigt nur den besten Chat; für den Mini-Graphen werden alle gestarteten Chats des aktiven Nodes aus der bestehenden Gesprächsliste verwendet. Jeder Edge erhält eine eigenständige, kompakte Read-only-Chatansicht direkt an der Verbindung, die zur spannendsten Passage oder mindestens zum Gesprächsende springt; die Gegenmeinung sitzt als Pille außerhalb beziehungsweise unterhalb des Chats, während die zentrale Meinung im Chat nicht wiederholt wird.
