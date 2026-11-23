# Zustimmung/Ablehnung: in den Chat und direkt unter jede Meinung

## Ziel
Die Frage „Wie stehst du zu dieser Meinung?“ wird dort gestellt, wo man der Meinung begegnet: direkt unter jeder Meinung in der Liste (wie ein Like-Button) und als erster Schritt im Chat. Kein eigenes Bewertungsfenster mehr.

## 1. Meinungen-Tab: Icons direkt unter jeder Meinung
- Unter jeder Meinung steht eine schlanke Reihe mit den 5 Icons (ohne Text, kompakt, wie Like-Leiste).
- Antippen speichert sofort, das gewählte Icon bleibt farbig markiert. Nochmal antippen eines anderen Icons ändert die Bewertung.
- Kurzes Aufploppen der Stufenbezeichnung beim Antippen, damit klar ist, was gewählt wurde.
- Das bisherige Bewertungsfenster (Popup) im Meinungen-Tab entfällt.
- Eigene Meinung: keine Leiste. Ohne eigene Meinung: Leiste ausgegraut, Tippen zeigt „Teile zuerst deine Meinung“.
- Nach Diskussionsende (nur lesen): Leiste zeigt die eigene Bewertung, ist aber nicht mehr änderbar.

## 2. Chat: Bewertung als erster Schritt
- Öffnet man einen Chat zu einer noch nicht bewerteten Meinung, erscheint oben im Chat (unter der Meinung des Gegenübers) die Frage mit den 5 Icons.
- Nach der Auswahl klappt die Leiste zu einer kleinen Zeile „Deine Haltung: Zustimmung · ändern“ zusammen; der Chat ist voll nutzbar.
- Schreiben bleibt möglich, auch ohne Bewertung (keine harte Sperre, damit keine Hürde wie beim Wedium-Test entsteht) – die Frage bleibt aber sichtbar oben, bis beantwortet.
- Im Kreis-Tab (Meinung antippen) bleibt der bisherige Schritt erhalten, nutzt aber das neue Wording.
- Gilt gleich für Handy und Desktop-Chatfenster, für echte Diskussion und Sim.

## 3. Wording-Vorschlag (DE / EN)
- Frage: „Wie stehst du zu dieser Meinung?“ / „Where do you stand on this?“
- Stufen: „Voll dabei“ · „Eher ja“ · „Unentschieden“ · „Eher nein“ · „Gar nicht“ /
  „Totally“ · „Mostly“ · „Unsure“ · „Not really“ · „Not at all“
- Eingeklappt im Chat: „Deine Haltung: …“ / „Your stance: …“
- Ersetzt „Meinungsunterschied“ als Beschriftung. Die Verständnis-Skala bleibt unverändert und klar getrennt.

## Was gleich bleibt
- Gespeicherte Werte (0/2/5/8/10), Graph-Position, Animationen der Bewertungen und Respekt-Bewertung bleiben unverändert; bestehende Bewertungen erscheinen sofort in der neuen Leiste.

## Technische Details
- `TTEmojiRating` erhält eine `compact`-Variante (nur Icons, kleine Höhe, optionales Label-Flash); Labels weiter aus `OPINION_DIFFERENCE_STEPS`/`tt.diffStep.*`.
- Neue Komponente `OpinionStanceBar` (Speichern über denselben Rating-Pfad wie `TTRatingDialog`, inkl. Broadcast auf den gemeinsamen Animations-Event-Pfad); in den drei Listen-Renderstellen von `TTSideTabs` (Zeilen ~348/381/413) eingebunden, `TTRatingDialog` entfernt.
- `EmbeddedChatView` und `FloatingChatWindow`: Kopfbereich mit `OpinionStanceBar` (expanded, solange keine Bewertung existiert; sonst eingeklappt). Bewertung wird für das Paar (eigene Meinung → Partnermeinung) gelesen.
- i18n: `tt.diffStep.*`, `tt.opinionDifferenceLabel` neu formuliert, neue Keys `tt.stanceQuestion`, `tt.yourStance` in de/en.
- Test: Wert-Zuordnung der 5 Stufen (0/2/5/8/10) und „unbewertet → Frage offen“ im Chat.
