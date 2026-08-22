# Nachthimmel-Hintergrund + Sterne als Nodes

## 1. Hintergrund außerhalb des Graphen beruhigen (nur Kosmos-Variante)

Die Änderungen an Punkt 1 und 2 betreffen ausschließlich die Kosmos-Variante. Die Augen-Variante bleibt exakt wie sie ist.

- Im Kosmos-Hintergrund bleibt außerhalb des Null-Punkt-Rings genau **ein** Ring als Orientierungslinie (r=300); der zweite Ring bei r=360 entfällt.
- Die zusätzlichen Hilfsringe der Level -1, -2, -3 (außerhalb des Null-Punkt-Rings) werden in der Kosmos-Variante nicht mehr gezeichnet; die Ringe innerhalb des Graphen bleiben unverändert.

## 2. Dezenter Nachthimmel (nur Kosmos-Variante)

- Außerhalb des Kosmos-Kreises kommt ein sehr feines Sternenfeld dazu: kleine Punkte, unterschiedliche Größen (0.6–1.6 px), Deckkraft ca. 0.06–0.28, ein paar einzelne etwas hellere Sterne.
- Die Sterne sind deterministisch platziert (fester Seed), damit sich der Hintergrund nie neu "würfelt" und stabil bleibt.
- Dichte bleibt niedrig: ein Hauch Nachthimmel, keine Milchstraße. Nur außen, damit der Graph lesbar bleibt.


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

- `src/components/tt/TTBackground.tsx`: Sternenfeld als deterministisch generierte `<circle>`-Liste (Seeded PRNG, nur außerhalb r≈310) — ausschließlich im `variant === 'cosmos'`-Zweig; äußeren Ring bei r=360 dort entfernen. Der `eye`-Zweig bleibt unverändert.
- `src/themes/signal/SignalRenderer.tsx`: Level-Ringe mit r > Null-Punkt-Radius nur ausblenden, wenn die Kosmos-Variante aktiv ist (Hintergrund-Präferenz wird als Prop durchgereicht).

- `src/lib/tt-layout.ts`: pro Node ein `rankRatio` (0 = höchste Punktzahl, 1 = niedrigste) mitgeben; `src/types/graph.ts` und `src/themes/tokenizer.ts` + `src/themes/types.ts` entsprechend erweitern.
- `src/themes/signal/SignalNode.tsx`: eine `StarShape`-Komponente mit Parametern (Farbe, Fill-Opacity, Glow-Stärke), gesteuert über `isTop5` / `rankRatio` / `isInactive`; ersetzt `MiddleShape*` und `OuterShape*` im TT-Modus. Nicht-TT-Modus bleibt unangetastet.
