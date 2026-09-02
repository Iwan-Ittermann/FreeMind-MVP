# Slide 3: Polarisierungs-Ergebnisse statt Archiv-Hinweis

Auf Slide 3 wird der Satz "Der Endstand ist dauerhaft archiviert. Die Diskussion läuft weiter unter freemind.chat/aug-test" ersetzt durch die Ergebnisse der Umfrage zur affektiven Polarisierung. Der Link wandert als Fußnote nach unten.

## Die Zahlen (aus der Datenbank geprüft)

Zwei Wellen (vor der Diskussion / am letzten Tag), Skala 0–100: Gefühl gegenüber Wähler:innen der am wenigsten bzw. am meisten gemochten Partei.

Sechs Personen haben beide Wellen vollständig beantwortet (Vorher-Nachher-Vergleich):

- Abstand zwischen "am wenigsten gemocht" und "am meisten gemocht": 62 → 40 Punkte (−22)
- Gefühl gegenüber der am wenigsten gemochten Seite: 12 → 25 (+13)
- Gefühl gegenüber der eigenen Seite: 74 → 65 (−9)

Gesamtzahlen zur Einordnung: 12 Antworten in Welle 1, 8 in Welle 2.

## Umsetzung auf der Slide

- Die rechte Karte "Was das zeigt" behält ihren Kern-Satz und bekommt darunter den Polarisierungs-Block: Titel "Affektive Polarisierung", die drei Werte als Vorher-→-Nachher-Zeilen, plus kleiner Hinweis auf die Stichprobe (n = 6 mit beiden Wellen).
- Der Archiv-/Link-Satz entfällt an dieser Stelle.
- Neue Fußnote unten auf Slide 3, zentriert über die Breite: "Ergebnisse ansehen und ausprobieren: freemind.chat/aug-test" — in Magenta/Gold-Akzent, klar getrennt von der bestehenden Fußzeile (freemind.chat links, Seitenzahl rechts).

## Technisch

- `/tmp/deck/build.py` wird angepasst (Slide-3-Block), Datenwerte fest eingetragen — keine Live-Abfrage im Skript.
- Ausgabe als neue Version: `/mnt/documents/freemind-partner-deck-v2.pdf`.
- QA: alle drei Seiten mit `pdftoppm` in Bilder wandeln und prüfen (Überlappungen, abgeschnittener Text, Ränder, Kontrast, Fußnoten-Kollision), Fehler beheben und erneut prüfen.
