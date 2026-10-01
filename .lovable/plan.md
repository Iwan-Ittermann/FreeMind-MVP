# Stream-Elemente einklappen und Vorschau

## Umsetzung
1. Im Cosmic Stream den Node-Graphen und den ausgewählten Chat jeweils mit einer kompakten Ein-/Ausklappsteuerung versehen. Beide Bereiche bleiben unabhängig voneinander bedienbar.
2. Unter dem aktuellen Post die drei nächsten, bereits deterministisch berechneten Stream-Ergebnisse als klar gekennzeichnete Vorschau laden. Ein Klick zeigt den jeweiligen Post mit seinem Live-Node-Graphen und Chat.
3. Deutsche und englische Beschriftungen ergänzen und Mobil/Desktop auf Überlappungen sowie funktionierende Auswahl prüfen.

## Technische Details
- Die Vorschau verwendet ausschließlich die vorhandenen zukünftigen `StreamEntry`-Ergebnisse; sie schreibt oder pinnt keine Zukunftseinträge.
- Stream-Logik, Veröffentlichungsrhythmus und gespeicherter Verlauf bleiben unverändert.
