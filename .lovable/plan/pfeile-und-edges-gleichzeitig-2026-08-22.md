# Pfeile und Edges gleichzeitig

Ja, beides lässt sich übereinander legen. Aktuell schließen sich die beiden Darstellungen aus: ist "Chats als Pfeile" aktiv, werden die Edge-Linien gar nicht gerendert.

## Verhalten nach der Änderung

- Pfeile: wie bisher immer sichtbar (Länge = Chatlänge, Farbe = eigene Punkte).
- Edges: zusätzlich vorhanden, aber wie im normalen Modus standardmäßig unsichtbar/stark gedimmt.
- Beim Mouse-Over eines Knotens leuchten gleichzeitig auf:
  - die Pfeile dieses Knotens (bestehendes Verhalten),
  - die Verbindungslinien zu seinen Gesprächspartnern.
- Knoten bleiben unverändert (kein zusätzliches Aufleuchten der Partner-Knoten).
- Klick-Verhalten bleibt: Pfeil und Edge öffnen denselben Chat (Read-only, wenn nicht beteiligt).
- Zeichenreihenfolge: Edges unter den Pfeilen, Pfeile unter den Knoten — so bleiben die Pfeilspitzen lesbar.

## Technisch

- `src/themes/signal/SignalRenderer.tsx`: Ternary bei Zeile 171 auflösen — die `signal-edges`-Gruppe immer rendern und `SignalChatArrows` bei aktivem Pfeil-Modus danach zeichnen. Highlight-/Dim-Logik der Edges unverändert übernehmen.
