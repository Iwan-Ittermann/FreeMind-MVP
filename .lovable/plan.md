# 3-Slide-Deck: "Wie freemind funktioniert" (PDF, deutsch)

Ein Partner-Deck im Look des bestehenden Ein-Slide-Pitches: dunkelblauer Hintergrund, blaue und orange Akzent-Pills, kondensierte Großbuchstaben-Headlines, "freemind" in Orange. Querformat 16:9, deutsch, mit echten Screenshots und echten Zahlen aus dem August-Test.

## Slide 1 — Das Prinzip

- Headline: "MODERATION BELOHNEN STATT VERHALTEN MODERIEREN"
- Drei Pills wie im Pitch: PROBLEM / LÖSUNG / MECHANISMUS, kurze Sätze (Anpassung der bestehenden Pitch-Formulierungen auf Deutsch).
- Rechts: Screenshot des Kosmos-Graphen aus /aug-test (Mobile-Frame), mit zwei kleinen Callouts: "Dynamischer Meinungsgraph" und "Bridging-Points-Algorithmus".

## Slide 2 — So läuft eine Diskussion

Drei Schritte nebeneinander, Logik aus /sogehts, aber in Partner-Sprache statt User-Sprache:

1. Meinung posten → sie erscheint als Punkt im Kreis.
2. Meinungsunterschied bewerten → große Differenz = große Distanz im Kreis.
3. Chatten und bewertet werden → Respekt vom Gegenüber zieht dich nach innen.

Darunter die Punkte-Formel als kleine handschriftliche Notiz (wie auf /sogehts): Meinungsunterschied × erhaltene Bewertung = Punkte, mit einem echten Beispielwert aus dem August-Test.

Screenshots: Meinungsunterschied-Skala und Verständnis-Skala (die vorhandenen /sogehts-Bilder, sonst frisch aufgenommen).

## Slide 3 — August-Test und nächste Diskussion

- Links: Ergebnisse des Test-Runs als große Kennzahlen — Teilnehmende, abgegebene Meinungen, geführte Chats, Nachrichten, Punkte des Siegers, Laufzeit (1 Woche). Alle Zahlen werden vorher per Datenbank-Abfrage geprüft; nichts wird geschätzt.
- Mitte: Top-5-Endstand aus dem gespeicherten August-Ranking (Rang, Punkte, gekürztes Meinungszitat, keine Namen).
- Rechts: "NÄCHSTE DISKUSSION" — was ein gemeinsamer nächster Live-Run bräuchte (Frage, Community-Reichweite, Zeitfenster) und der Hinweis, dass die August-Diskussion unter freemind.chat/aug-test jederzeit ausprobierbar ist.

## Vorgehen (technisch)

- Zahlen: Read-only-Abfragen auf `opinions`, `chat_messages`, `chats`, `opinion_ratings` und `archive_results` für das August-Thema; Bots und Testkonten ausgeschlossen. Fehlt eine Zahl belastbar, wird sie weggelassen statt erfunden.
- Screenshots: Playwright auf der lokalen Vorschau (`/aug-test`, mobile Breite) für Graph, Bewertungsskala und Verständnis-Skala; vorhandene `sogehts-*`-Assets werden wiederverwendet, wo sie passen.
- Erzeugung: Python + reportlab mit registrierter Unicode-Schrift (Umlaute), Farben und Pill-Rahmen aus dem Pitch-Slide abgeleitet. Kein Projekt-Code wird verändert — die Ausgabe ist eine Datei unter /mnt/documents.
- QA: PDF nach `pdftoppm` in Bilder wandeln und alle drei Seiten prüfen (Überlappungen, abgeschnittener Text, Kontrast, Ränder), Fehler beheben und erneut prüfen.

Ergebnis: `freemind-partner-deck.pdf` (3 Seiten) im Dokumentenbereich.
