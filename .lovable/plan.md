# Nachthimmel-Hintergrund + Sterne als Nodes

## 1. Hintergrund außerhalb des Graphen beruhigen

Aktuell werden außerhalb des Null-Punkt-Rings mehrere Hilfsringe gezeichnet (die Ringe für die Level -1, -2, -3 aus der Layout-Logik, plus im Kosmos-Hintergrund ein zweiter Ring bei r=360). Das wirkt unruhig.

- Außerhalb des Null-Punkt-Rings bleibt genau **ein** Ring als Orientierungslinie (der Null-Punkt-Ring selbst bei r=300).
- Alle weiteren äußeren Ringe entfallen; die Ringe innerhalb des Graphen bleiben unverändert.

## 2. Dezenter Nachthimmel

- Im Hintergrund (Fläche außerhalb des Iris-/Kosmos-Kreises) kommt ein sehr feines Sternenfeld dazu: kleine Punkte, unterschiedliche Größen (0.6–1.6 px), Deckkraft ca. 0.06–0.28, ein paar einzelne etwas hellere Sterne.
- Die Sterne sind deterministisch platziert (fester Seed), damit sich der Hintergrund nie neu "würfelt" und stabil bleibt.
- Dichte bleibt niedrig: ein Hauch Nachthimmel, keine Milchstraße. Nur außen, damit der Graph lesbar bleibt.
- Funktioniert für beide Hintergrundvarianten (Auge und Kosmos).

## 3. Alle Nodes als Sterne

- Bisher: Top 5 = goldener Stern, restliche Nodes = Kreise/Quadrate. Neu: **alle** Meinungs-Nodes nutzen die Sternform (gleiche Geometrie wie die Top 5).
- Helligkeit richtet sich nach dem Rang in der Punkte-Rangliste:
  - Platz 1–5: voll leuchtendes Gold mit Glow (wie heute).
  - Danach abgestuft schwächer: weniger Glow, gedämpftere Farbe, leicht kleinerer Kern — je weiter unten, umso zurückhaltender.
  - Nodes ohne Chats (inaktiv) bleiben als klar unterscheidbarer, hohler/gedimmter Stern (statt gestricheltem Kreis), damit "wartet noch" weiter erkennbar ist.
- Eigener Node bleibt rot mit "DU"-Label, ebenfalls in Sternform.
- Bot-Node bleibt unverändert (AI-Kreis).
- Punktezahl-Label, Online-Punkt, Unread-Badge und Auswahl-Glow bleiben unverändert, damit die Übersicht nicht leidet.

## Technische Details

- `src/components/tt/TTBackground.tsx`: Sternenfeld als deterministisch generierte `<circle>`-Liste (Seeded PRNG, nur außerhalb r≈310), äußeren Ring bei r=360 in der Kosmos-Variante entfernen.
- `src/themes/signal/SignalRenderer.tsx`: Level-Ringe filtern — Ringe mit r > Null-Punkt-Radius werden nicht mehr gezeichnet.
- `src/lib/tt-layout.ts`: pro Node ein `rankRatio` (0 = höchste Punktzahl, 1 = niedrigste) mitgeben; `src/types/graph.ts` und `src/themes/tokenizer.ts` + `src/themes/types.ts` entsprechend erweitern.
- `src/themes/signal/SignalNode.tsx`: eine `StarShape`-Komponente mit Parametern (Farbe, Fill-Opacity, Glow-Stärke), gesteuert über `isTop5` / `rankRatio` / `isInactive`; ersetzt `MiddleShape*` und `OuterShape*` im TT-Modus. Nicht-TT-Modus bleibt unangetastet.
