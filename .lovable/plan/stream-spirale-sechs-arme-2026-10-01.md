# Stream-Spirale: sechs Arme

## Änderung
- Die bisherige einzelne Spirale wird durch sechs gleichmäßig um das Zentrum verteilte archimedische Arme ersetzt.
- Die vorhandenen Stream-Punkte werden möglichst gleichmäßig auf die sechs Arme verteilt.
- Der heiße Punkt durchläuft zuerst einen Arm vollständig von innen nach außen, springt danach zum innersten Punkt des nächsten Arms und läuft dort wieder nach außen.
- Die sechs Arme drehen sich weiterhin pro Umlauf gemeinsam um den Goldenen Winkel, damit nicht dauerhaft dieselben Richtungen zuerst drankommen.
- Die bestehenden Regeln bleiben erhalten: genau ein Punkt pro Kandidat, keine Wiederholung im Umlauf, vergangene Einträge bleiben festgeschrieben und neue Kandidaten werden für aktuelle/künftige Punkte live berücksichtigt.

## Darstellung
- Im Graphen werden alle sechs gepunkteten Arme als zusammengehörige Form angezeigt.
- Fokuspunkt und Verbindung zum ausgewählten Node bleiben unverändert hervorgehoben.

## Prüfung
- Tests sichern sechs Armrichtungen, die Reihenfolge innen → außen je Arm, vollständige Kandidatenabdeckung und deterministische Auswahl.
- Die Darstellung wird im laufenden Graphen auf Sichtbarkeit und korrekte Fokusposition geprüft.
