# Cluster-Bildung im Graphen reparieren

## Status heute (geprüft im Code und in den Daten)

- Die Kanten-Gewichte werden weiter aus `Verständnis × Meinungsunterschied` gebildet (`tt-layout.ts`), der Winkel wird weiter aus dem Meinungsunterschied abgeleitet.
- Der Meinungsunterschied wird pro Paar bereits **gemittelt** (beide Richtungen zusammengefasst in `useTopicData.ts`), die Skala ist 0–10 — passt zur Winkelformel. Ein Umrechnungsfehler liegt hier nicht vor.
- Der Radius kommt jetzt aus der **Gesamtsumme** der Punkte, tie-aware in Gruppen: viele Knoten landen auf demselben Ring. Genau dort greift der Kollisions-Löser, der ausschließlich **angular** verschiebt — er schiebt Knoten auf dem Ring auseinander und überschreibt damit die aus dem Meinungsunterschied berechneten Winkel.
- Zusätzlich wählt die Winkelvergabe pro Nachbar bewusst die Variante mit dem **größten** Abstand zu bereits platzierten Knoten. Das maximiert Streuung statt Nähe und arbeitet gegen Cluster.

Der Radius bleibt wie gewünscht auf der Gesamtsumme. Geändert wird nur die Winkel-/Cluster-Logik.

## Was gebaut wird

1. **Winkel: Anziehung statt Streuung**
   - Für jeden Knoten wird der Zielwinkel als gewichtetes Mittel über alle bereits platzierten Nachbarn berechnet (Gewicht = Stärke der Beziehung).
   - Bei **niedrigem** Meinungsunterschied zieht der Knoten nahe an den Nachbarn (kleiner Offset), bei hohem Unterschied auf die Gegenseite. Die Auswahl der Seite orientiert sich künftig am geringsten Konflikt mit dem Cluster, nicht am maximalen Abstand zu allen Knoten.
   - Reihenfolge der Platzierung: Knoten mit den meisten Bewertungen zuerst (deterministisch, id-sortiert bei Gleichstand), damit Cluster-Kerne früh stehen.
   - Mindestabstand wird von 0,35 auf einen kleineren Wert gesenkt, damit Cluster eng bleiben dürfen.

2. **Kollisions-Löser cluster-freundlich**
   - Angulare Verschiebung wird gedeckelt (kleines Maximum pro Knoten).
   - Übersteht ein Überlapp diesen Deckel, wird stattdessen der Radius minimal variiert (kleiner Offset innerhalb desselben Punkte-Rings), statt den Knoten weit auf dem Ring zu schieben.
   - Ergebnis: gleiche Punktezahl bleibt sichtbar auf derselben Höhe, die Winkel-Semantik bleibt erhalten.

3. **Inaktive Knoten (0 Punkte)**
   - Sitzen weiter auf dem äußeren Ring, bekommen aber ebenfalls ihre disagreement-basierten Winkel, statt gleichmäßig verteilt zu werden — so stehen sie neben ihren inhaltlich nahen Nachbarn.

4. **Determinismus bleibt Pflicht**
   - Alle Iterationen bleiben id-sortiert, keine Zufallszahlen, gleiche Eingabe → gleiche Positionen (auch nach Reload).

Keine zusätzliche Cluster-Grafik (keine Hüllen/Tönungen) — Cluster entstehen rein räumlich.

## Technische Details

- Datei: `src/lib/tt-layout.ts`
  - `calculateDeterministicAngles`: Platzierungsreihenfolge nach Grad, Seitenwahl cluster-orientiert, `minSep` reduziert, gemittelter Paar-Unterschied als einzige Winkelquelle (bereits vorhanden, rechengünstig — keine Doppelauswertung der beiden Einzelbewertungen).
  - `resolveCollisions`: Deckel für angulare Verschiebung + radiale Mikro-Verschiebung als Fallback; Bot bleibt gepinnt.
  - Radiale Logik (Gesamtsumme, Gruppen-Ranking, Top-5-Sterne, Inaktiv-Ring) bleibt unverändert.
- Keine DB-Änderungen, keine neuen Queries; Aufwand bleibt O(n²) bei < 100 Knoten.

## Prüfung

- `/go` und `/test` im Browser gegen die Live-Daten (17 Meinungen, 76 Unterschieds-Bewertungen) ansehen: Gruppen mit geringem Unterschied müssen benachbart stehen, hohe Unterschiede gegenüber.
- Zweimaliges Laden vergleichen (identische Positionen), Punktezahlen und Ring-Zuordnung unverändert.
