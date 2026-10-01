# Simulation: 40 KI-Teilnehmer, Play-Button, 5 Minuten

## Kurzantwort: Was kostet das?

Wenig Infrastruktur, die Kosten entstehen fast nur durch KI-Anfragen. Entscheidend ist, wie viele Anfragen pro Lauf nötig sind.

| Variante | KI-Anfragen pro 5-Min-Lauf | grobe Kosten pro Lauf |
|---|---|---|
| A: Jeder Teilnehmer einzeln (~alle 30 s) | ca. 400 | hoch (mehrere Euro) |
| B: Gebündelt, ein "Takt" alle 10 s erzeugt 3–5 Nachrichten + Bewertungen | ca. 30 | niedrig (unter 1–2 Euro) |

Empfehlung: **Variante B**. Sie wirkt genauso lebendig (etwa 100–150 Nachrichten pro Lauf, 1–3 neue Meinungen), kostet aber nur einen Bruchteil. Die Kosten werden von deinen KI-Guthaben abgebucht; genaue Werte zeige ich nach dem ersten Testlauf aus den echten Abrechnungsdaten. Ohne Play-Druck entstehen keine Kosten.

Sonstiger Aufwand: keine zusätzlichen Server, die Datenbank verkraftet das problemlos.

## Was gebaut wird

1. **Eigenes Simulations-Thema** (z. B. /sim), getrennt von echten Diskussionen; alle 40 Teilnehmer als Demo-Accounts markiert und aus Statistiken ausgeschlossen.
2. **40 Personas** einmalig erzeugt: Name, Haltung, Ton, Streitlust, Offenheit — verteilt über alle Lager, damit der Graph realistisch aussieht.
3. **Play-Button**: startet einen Lauf von genau 5 Minuten, zeigt Restzeit. Erneutes Drücken während eines Laufs verlängert nicht (oder: auf 5 Min zurücksetzen — wählbar). Danach stoppt alles automatisch.
4. **Pro Takt (alle ~10 s)** wählt das System einige Gesprächspaare aus und lässt die KI für sie schreiben:
   - neue Chats starten oder bestehende fortsetzen,
   - Nachrichten im Stil der Persona,
   - gegenseitige Bewertungen (Respekt/Verständnis und Differenz) nach jedem Wechsel aktualisieren,
   - gelegentlich kommt ein neuer Teilnehmer mit neuer Meinung dazu.
5. Graph, Stream-Spirale und Punkte reagieren live wie bei echten Nutzern.

## Sicherheitsgurte

- Läuft nur nach Play-Druck, harte Obergrenze an Takten pro Lauf.
- Nur ein Lauf gleichzeitig (Sperre in der Datenbank).
- Bei aufgebrauchtem Guthaben oder Fehlern stoppt die Simulation sofort und zeigt den Grund an.
- Play-Button nur für Admins (gleiches Passwort wie der Admin-Bereich), damit niemand fremd Guthaben verbraucht.

## Technische Details

- Edge Function `sim-tick`: liest Simulationsstatus (`running_until`), stoppt wenn abgelaufen; sonst ein gebündelter Aufruf an `openai/gpt-6-astra` (Responses, gestreamt, reasoning low) mit kompaktem Zustand (Personas der gewählten Paare, letzte Nachrichten) → strukturiertes JSON mit Nachrichten, Bewertungen, optional neuer Meinung; schreibt alles in die bestehenden Tabellen.
- Taktgeber: Self-Invocation mit 10 s Abstand, Tiefenbudget (max. 30 Hops), Lease-Lock, Weiterlauf nur wenn `running_until` in der Zukunft; Pause bei 402/403/wiederholtem 429.
- Edge Function `sim-control` (start/stop, Admin-Passwort serverseitig geprüft).
- Tabelle `sim_state` (Status, Lock, Pausegrund) + `sim_personas`; Demo-User via bestehendem `is_demo`-Mechanismus.
- UI: Play/Stop + Countdown im Header des Simulations-Themas, DE/EN-Texte.

## Offene Fragen vor dem Bau

- Variante B ok?
- Soll der Play-Button öffentlich (Besucher sehen eine lebende Demo) oder nur für Admins sein?
