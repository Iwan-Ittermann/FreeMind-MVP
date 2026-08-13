# Bewertungs-Skalen 0–10, Verständnis-Rating und Listen-Feinschliff

## 1. Meinungsliste: kein Sprung mehr auf den Graph

Tippen auf eine Meinung in der Liste öffnet nicht mehr den Knoten im Graph (kein `onOpinionTap` → `setSelectedNode` mehr). Die Liste bleibt in sich geschlossen: Bewertung per Popup, Chat per Button.

## 2. Respekt wird zu „Verständnis“

- Neue Rahmung: „Wie gut fühlst du dich in deinem Standpunkt verstanden?“ (Label i18n, DE „Verständnis“, EN „Understanding“).
- Interne Benennung (`empathy`, `chat_ratings`) bleibt unverändert.
- Icon: Kopf-Silhouette mit Sprechblase und Häkchen (nach der hochgeladenen Referenz als eigenes SVG-Icon-Component), ersetzt das Herz im Chat.

## 3. Neue Punkteskala: 0–10 × 0–10 = 0–100

- Meinungsunterschied: 11 Stufen 0–10.
- Verständnis: 11 Stufen 0–10, keine negativen Werte mehr.
- Brückenpunkte pro Chat = Unterschied × Verständnis, also 0–100.
- Gesamtpunkte eines Knotens = Summe der Punkte, die ihm seine Gesprächspartner gegeben haben (gerichtete Logik bleibt).
- Bestehende Bewertungen werden umgerechnet: Verständnis `round(max(alt,0)/5)`, Unterschied `round(alt/10)`.

## 4. Graph-Anpassungen

- Keine negativen Zonen mehr: Höchste Punktzahl im Zentrum, linear nach außen; **0 Punkte = äußerste Linie**.
- Knoten ohne jede Bewertung („neu“) werden als **inaktiv** dargestellt (gedimmt, kleiner) und sitzen ebenfalls auf der äußersten Linie.
- Die **Top 5** Knoten nach Punkten werden als Stern dargestellt (bisher hängt die Sternform an der Zone — künftig strikt an Rang 1–5).
- Determinismus bleibt: Winkel weiter aus symmetrischem Unterschied, ID-sortierte Iteration, Tie-Breaks über die ID.

## 5. Chat-Tab: Verständnis-Bar immer sichtbar

Die Verständnis-Skala liegt dauerhaft über dem Eingabefeld im Chat. Vor der zweiten Nachricht ist sie sichtbar, aber inaktiv (gedimmt + Hinweistext), danach aktiv. Der bisherige Herz-Button, der die Bewertung ein-/ausklappt, entfällt.

## 6. Meinungsliste: kurzes Snippet + Ausklappen

Vorschautext wird deutlich kürzer (ca. 90 Zeichen, einzeilig gekürzt). Rechts ein Chevron-Button, der die Meinung vollständig ausklappt (pro Eintrag, mehrere gleichzeitig möglich).

## Technische Umsetzung

- **Migration**
  - Umrechnung der Daten: `chat_ratings.empathy = round(greatest(empathy,0)/5.0)`, `chat_ratings.disagreement = round(disagreement/10.0)`, `opinion_ratings.disagreement = round(disagreement/10.0)`.
  - Bestehende CHECK-Constraints/Bereiche auf 0–10 anpassen (falls vorhanden), Defaults `50` → `5`.
  - `get_graph_pairs` und `get_topic_directed_pairs`: Fallback `50` → `5`.
- **Frontend**
  - `src/components/tt/TTEmojiRating.tsx`: 11 Stufen 0–10 (kompakte Buttons/Segmentleiste), Prozentanzeige entfällt.
  - Neuer Slider/Segment-Regler für Verständnis 0–10 mit dem neuen Icon, ersetzt `RatingSliders`/`VerticalRatingSlider`-Nutzung in `EmbeddedChatView.tsx` (permanent, `disabled` vor der 2. Nachricht).
  - `src/components/icons/UnderstandingIcon.tsx`: neues SVG (Kopf + Sprechblase + Häkchen).
  - `src/lib/tt-layout.ts`: Schwellen/Level-Mapping auf 0–100 skalieren, negative Bänder entfernen, `0 Punkte → äußerste Linie`, Winkelberechnung auf 0–10-Unterschied normieren, Top-5-Rang berechnen und als `isTop5`/`isInactive` an die Nodes hängen.
  - `src/types/graph.ts`: `isTop5`, `isInactive` an `GraphNode`.
  - `src/themes/signal/SignalNode.tsx` + `tokenizer.ts`: Sternform an `isTop5`, gedimmte Inaktiv-Darstellung.
  - `src/components/tt/TTSideTabs.tsx`: `onOpinionTap` entkoppelt, kurzes Snippet + Chevron-Expand.
  - `src/pages/Discussion.tsx`: `onOpinionTap`-Prop entfernen.
  - `src/hooks/useOpinionRating.ts`, `useTopicData.ts`, `TTBottomPanel.tsx`, `TTRatingDialog.tsx`: 0–10-Werte statt 0–100.
  - `de.json`/`en.json`: neue Keys für Verständnis-Label, Inaktiv-Hinweis, Sortierung „Punkte“.
