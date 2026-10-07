# Roadmap

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
