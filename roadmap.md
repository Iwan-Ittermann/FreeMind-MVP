# Roadmap

## Simulation testen und markieren
- [ ] Eigene Meinung deutlicher hervorheben
- [ ] Zehn wechselnde Dummy-Antworten nach Besuchernachrichten an Sim-Teilnehmer; Respektbewertung prüfen
- [ ] Simulations-Pille oben links und neues Countdown-Banner
- [ ] Hochauflösendes Wedium-PNG verwenden und Browser-Icon aktualisieren
- [ ] Ablauf und Darstellung prüfen

## Eigenständige Wedium-Simulation
- [x] /wedium/go als Simulation mit bestehendem Wedium-Look wiederherstellen (bestehende Wedium-Bildreferenzen wiederverwendet)
- [x] /go mit normalem Auge anzeigen; beide Ansichten auf Desktop und Mobil geprüft (Wedium-Bilder werden lokal nicht ausgeliefert)

## Simulation besser integrieren
- [x] Übergang, Textfluss und Darstellung auf beiden Landingpages angleichen; Scroll-Snap beim Zuschauen erhalten
- [x] Simulation beim Scrollen nach dem Hero vorladen; Bedienelemente erst beim Interagieren zeigen
- [x] Spirale standardmäßig ausblenden und Alle Chats ohne eigene Meinung zugänglich machen
- [x] Link unter Simulation in neuem Tab öffnen; Popup durch Registrierungslink im Countdown-Banner ersetzen
- [x] Wedium-Tab-Zuordnung korrigieren und Interaktionen auf beiden Seiten prüfen

## Eingebettete Event-Simulation
- [x] Startseiten-Links auf Wedium-Test ausrichten und August-Hero-Link entfernen
- [x] Mitmachbare Simulation zwischen „Was passiert“ und „Über mich“ einbetten
- [x] Wedium-Creator-Platzhalter durch Simulation im Koop-Look ersetzen
- [x] Beide Anmeldebereiche auf Wedium-Event ausrichten und Wedium-Anmeldung nutzen
- [x] Einbettung, Sprachwechsel und Meinungseingabe ohne Verifizierung geprüft; Einbettungen bleiben auf dem Simulationsthema, Anmeldeformulare mit abgefangener Antwort geprüft

## /go Event-Vorschau und lesbare Simulation
- [x] Nachrichten vollständig und Meinungsblasen textnah darstellen (3 Zeilen: 52px, kurze Meinung: 24px)
- [x] Fortschrittslinie sofort und bestätigte Sim-Uhr anzeigen
- [x] /go zeigt vor dem Event dieselbe read-only Sim mit Countdown und Registrierungs-Popup nach 10 Sekunden
- [x] /wedium/go auf /go umleiten; Event- und Sim-Daten getrennt halten
- [x] Vorschau, Popup und Zugangsgrenzen prüfen (keine Eingabe/Bewertung, Event-Themenwechsel geprüft, Build OK)

## Graph-Feinschliff und natürlicher Nachrichtenrhythmus
- [x] Linien dünner und weißgrau darstellen
- [x] Rechteckiges Abschneiden der Nodes beseitigen; neue Nodes an Ort und Stelle aufploppen lassen
- [x] Deterministische Lese-/Verarbeitungszeiten ergänzen und Nachrichten desselben Chats nacheinander animieren
- [x] Datensatz und Live-Darstellung prüfen (26 Chats, mindestens 14 Sekunden Abstand, Replay deployed)

## Stream-Spirale und beschleunigte Simulation
- [x] Spiralen-Schalter ohne Neuladen synchronisieren
- [x] 72-Stunden-Simulation auf 60-fache Geschwindigkeit setzen
- [x] Simulationszeit durch dünne Fortschrittslinie mit rotem Punkt ersetzen
- [x] Desktop und Mobil live prüfen

## Stream, Wedium-Look und Simulationszeit
- [x] Stream auf Desktop wie auf Mobil darstellen
- [x] /wedium/go: Wedium-Farbverlauf, Freemind × Wedium-Logo, reduzierter schwarzer Kreis und hochgeladenes Node-Icon (16 × 25 px, Desktop/Mobil geprüft)
- [x] /sim: aktuell dargestellten Zeitstempel sichtbar anzeigen

## Stream-Design (aktuell)
- [x] Cosmic Post-Ansicht mit Live-Mini-Graph umsetzen
- [x] Eigenständige kompakte Read-only-Chats direkt an den Edges umsetzen
- [x] Desktop und Mobil ohne Überlappungen prüfen

## Stream-Spirale (aktuell)
- [x] Sechs archimedische Arme und armweise Innen-außen-Reihenfolge umsetzen
- [x] Darstellung, Tests und Live-Graph prüfen

## Simulation /sim
- [x] Bestehende Mechanismen prüfen (Demo-Accounts/is_demo, Topic-Routing, Ratings)
- [x] Migration: sim_state, sim_personas, RPCs (Limits serverseitig)
- [x] Edge Function sim-seed (40 Personas + Accounts + Meinungen)
- [x] Edge Function sim-control (start/stop, Tageslimit 4, Einzellauf-Sperre)
- [x] Edge Function sim-tick (90 s, 10-s-Takte, gebündelter KI-Aufruf, Self-Invocation mit Budget)
- [x] Frontend: /sim Route, Play-Button + Countdown, Banner, DE/EN
- [ ] Kosten aus Abrechnungsdaten verifizieren

## Offen (alt)
- [ ] PostHog-Events nach Publish verifizieren
- [ ] /gutefrage-Datum nach 100 Signups festlegen
- [ ] Tägliche Zusammenfassungen bleiben aus
- [x] Sim-Frage geändert: „Wie könnte Social Media wieder positiver werden?" (Topic-Titel in DB + SIM_TOPIC_TITLE)
- [x] Simulation /sim umgesetzt: sim_state/sim_personas, sim-control + sim-tick, Route, Play-Button, Banner, DE-Default; 3 Testläufe ok (Chats, Nachrichten, Bewertungen, neue Personas)

## Stream-Folding und Vorschau (aktuell)
- [x] Node-Graph und Chat unabhängig einklappbar machen
- [x] Drei kommende Stream-Ergebnisse als Vorschau ergänzen
- [x] Mobil und Desktop prüfen

## /sim 72h-Replay (Hybrid)
- [x] Timeline-Generator + Artefakt (src/data/sim-timeline.json)
- [x] Replay-Engine (Weltzeituhr, fester Loop-Start, Nachholen bei Seitenaufruf)
- [x] Landingpage-Button auf /sim
- [x] Nachrichten als lesbare Textblasen, aktive Kanten und bleibende Bewertungs-Pfeile
- [ ] Live-KI-Antwort, wenn echte Besucher chatten

## Stream-Navigation und lebendige Sim-Visualisierung
- [x] Untere Leiste auf Meinungen, Graph und Chats reduzieren
- [x] Stream und Impressum ins Zahnrad-Menü verlegen
- [x] Neue Meinungen 4–8 Sekunden als gekürzte Sprechblase zeigen
- [x] Sim-Nachrichten und Bewertungen mit gemeinsamer Ereignisspur animieren
- [x] Mobil und Desktop live prüfen

## Schnellere Simulation und Cluster-Bewertungen
- [x] Replay auf 120× erhöhen (eine Simulationsstunde in 30 Sekunden)
- [x] Neue Meinungsblasen innerhalb des sichtbaren Graphen halten
- [x] Nachrichten langsamer an einer Ecke entlang der sichtbaren Kante führen
- [x] Viele eigenständige Meinungsunterschied-Bewertungen für Cluster ergänzen
- [x] Datensatz neu erzeugen, Replay-Funktion veröffentlichen und live prüfen

## Später (während des Events)
- [ ] Push-Option: auf Desktop "im Browser" statt "aufs Handy" anzeigen
- [ ] Mobil: zuerst "Shortcut installieren" anbieten
