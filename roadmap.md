# Roadmap

## Stream-Design (aktuell)
- [x] Cosmic Post-Ansicht mit Live-Mini-Graph umsetzen
- [x] Eigenständige kompakte Read-only-Chats direkt an den Edges umsetzen
- [ ] Desktop und Mobil ohne Überlappungen prüfen

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
