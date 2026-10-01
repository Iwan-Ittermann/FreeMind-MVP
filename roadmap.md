# Roadmap

## Simulation /sim (aktuell)
- [ ] Bestehende Mechanismen prüfen (Demo-Accounts/is_demo, Topic-Routing, Ratings)
- [ ] Migration: sim_state, sim_personas, RPCs (Limits serverseitig)
- [ ] Edge Function sim-seed (40 Personas + Accounts + Meinungen)
- [ ] Edge Function sim-control (start/stop, Tageslimit 4, Einzellauf-Sperre)
- [ ] Edge Function sim-tick (90 s, 10-s-Takte, gebündelter KI-Aufruf, Self-Invocation mit Budget)
- [ ] Frontend: /sim Route, Play-Button + Countdown, Banner, DE/EN
- [ ] Build + Verifikation (Testlauf, Kosten aus Abrechnungsdaten)

## Offen (alt)
- [ ] PostHog-Events nach Publish verifizieren
- [ ] /gutefrage-Datum nach 100 Signups festlegen
- [ ] Tägliche Zusammenfassungen bleiben aus
- [x] Sim-Frage geändert: „Wie könnte Social Media wieder positiver werden?" (Topic-Titel in DB + SIM_TOPIC_TITLE)
- [x] Simulation /sim umgesetzt: sim_state/sim_personas, sim-control + sim-tick, Route, Play-Button, Banner, DE-Default; 3 Testläufe ok (Chats, Nachrichten, Bewertungen, neue Personas)
