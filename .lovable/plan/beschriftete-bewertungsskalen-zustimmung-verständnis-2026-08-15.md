# Beschriftete Bewertungsskalen (Zustimmung / Verständnis)

## 1. Meinungsunterschied: 5 beschriftete Stufen

Statt Zahlen bekommen die fünf Buttons klare Labels (i18n DE/EN) und Icons:

| Stufe | Label DE | Label EN | Wert intern |
| --- | --- | --- | --- |
| 0% | Starke Zustimmung | Strong agreement | 0 |
| 20% | Zustimmung | Agreement | 2 |
| 50% | Neutral | Neutral | 5 |
| 80% | Ablehnung | Disagreement | 8 |
| 100% | Starke Ablehnung | Strong disagreement | 10 |

- Anordnung: von Zustimmung (links) bis Ablehnung (rechts), farblich von zustimmend zu ablehnend abgestuft.
- Icons pro Stufe (lucide): doppelter Haken, Haken, Minus, X, doppeltes X — Icon oben, kurzes Label darunter, damit die Buttons auf dem schmalen Mobil-Frame lesbar bleiben.
- Werte bleiben 0/2/5/8/10, es ändert sich nichts an gespeicherten Daten oder Punkteberechnung.

## 2. Verständnis-Skala im Chat

- Label wird zu „Wie gut versteht der/die andere dich?“ (EN: „How well does the other person understand you?“).
- Fünf Buttons mit Labels: Gar nicht (0), Wenig (2), Teils/Teils (5), Gut (8), Sehr gut (10).
- Der Zähler „x/10“ entfällt; solange die Skala gesperrt ist, bleibt nur der bestehende Freischalt-Hinweis stehen.
- Zwischen Skala und Eingabefeld kommt ein zusätzlicher Abstand (unterer Innenabstand + etwas mehr Luft über dem Input), damit keine Fehlklicks passieren.

## Technische Umsetzung

- `src/components/tt/TTEmojiRating.tsx`: Steps als Objekte mit `value`, `i18nKey`, Icon; Grid mit Icon + Label, Aktiv-Zustand wie bisher.
- `src/components/chat/EmbeddedChatView.tsx`: Label-Key tauschen, `${empathy}/10` entfernen, Button-Beschriftungen aus i18n, `pb-3` / zusätzliche Abstandsklasse zum Input-Footer.
- `src/components/tt/TTBottomPanel.tsx` und `TTRatingDialog.tsx`: nur prüfen, dass die Label-Zeile unter der Skala nicht doppelt wirkt (evtl. redundanten Untertitel entfernen).
- `src/i18n/locales/de.json` + `en.json`: neue Keys `tt.diffStep.*` (5), `tt.understandingStep.*` (5), `tt.understandingQuestion`.
- Keine DB-Änderungen.
