# Erklärvideo: freemind-Simulation im Wedium-Look

## Rahmen

- Hochformat 9:16 (1080×1920), Wedium-Look (Screen-Background, Graph-Disc, Personen-Icons, Navy/Koralle/Periwinkle, Albert Sans), Deutsch.
- Auflösung: 4k
- Ohne Ton und ohne Sprecherstimme. Szene 1 (Headshot) dreht ihr selbst und fehlt im Video.
- Ausgabe als MP4 in den Dateien, jede Szene mit kurzer Pause am Ende, damit du leicht schneiden kannst.
- Ich arbeite in zwei Etappen: Erst kommt ein Entwurf mit allen Szenen, danach eine Runde Änderungen.

## Szene 2: Der Kreis lebt (ca. 15–20 s)

- Die Frage „Welche Gesetze wünschst du dir für Social Media?“ erscheint groß in der Mitte und fliegt dann nach oben an ihren festen Platz.
- Im Kreis stehen etwa 10–14 Meinungen, verteilt über mehrere Ringe und nicht nur am Rand. Ich ordne sie für ein klares Bild neu an.
- Mehrere Redeblasen fliegen mit Stromlinie hin und her.
- Die Personen bewegen sich sichtbar weich zu ihren neuen Plätzen, nach innen oder nach außen, damit man die Dynamik versteht.

## Szene 3: So machst du mit (ca. 35–45 s)

1. **Tab Graph:** Die Meinung „Ich will ein Gesetz, dass Kindergesichter automatisch verpixelt werden.“ wird eingetippt und gepostet. Danach erscheint der eigene Node mit Rahmen und „DU“-Plakette.
2. **Tab Meinungen:** Ein Tap öffnet die Liste. 5 Meinungen werden im Schnelldurchlauf mit den Skalen-Icons bewertet.
3. **Tab Chat:** Ein Chat öffnet sich, jede Seite schreibt zwei Nachrichten. Danach wird die Verständnis-Skala hervorgehoben und eine Bewertung gesetzt.
4. **Neue Animation:** Der Chatpartner bekommt sichtbar Punkte (+X fliegt zu seinem Zähler) und rutscht weich näher zur Mitte.

## Offene Punkte

- Ich habe die Rechtschreibung im Skript leise korrigiert: „Gesetze“, „wünschst“ und „Gesetz“.
- Die Inhalte der Meinungen und Chats schreibe ich selbst, kurz und passend zum Thema. Du kannst sie in der Änderungsrunde ersetzen.

## Technische Details

- Der Video-Agent baut die Szenen mit Code nach (Motion Graphics) und nimmt dafür die echten Wedium-Assets aus dem Projekt: Hintergründe, 12 Personen-Icons, Logos und Schrift. Bildschirmaufnahmen der laufenden Simulation nutzt er nicht. Nur so lassen sich gezielte Neuanordnung, Übergänge und die neue Punkte-Animation sauber steuern.
- Als optische Vorlage bekommt er die laufende App (/wedium/go).
- Ausgabe: /mnt/documents/videos/freemind_erklaervideo_hochformat.mp4. Am Projekt-Code ändert sich nichts.
