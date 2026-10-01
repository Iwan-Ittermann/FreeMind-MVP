# Simulation: 40 KI-Teilnehmer, öffentlicher Play-Button, 90 Sekunden

## Kurzantwort: Was kostet das?

Wenig Infrastruktur, die Kosten entstehen fast nur durch KI-Anfragen.

| Kennzahl | Wert |
|---|---|
| Lauf | 90 Sekunden, ca. 9 Takte à 10 s |
| KI-Anfragen pro Lauf | ca. 9 (gebündelt: je 3–5 Nachrichten + Bewertungen + evtl. neue Meinung) |
| grobe Kosten pro Lauf | niedrig (Cent-Bereich bis wenige Zehntel Euro) |
| Tageslimit | max. 4 Läufe pro Tag (für alle Besucher zusammen) |

Empfehlung: gebündelte Takte statt einer Anfrage pro Teilnehmer — wirkt genauso lebendig (ca. 30–45 Nachrichten pro Lauf), kostet aber nur einen Bruchteil. Die Kosten werden von deinen KI-Guthaben abgebucht; genaue Werte zeige ich nach dem ersten Testlauf aus den echten Abrechnungsdaten. Ohne Play-Druck entstehen keine Kosten. Sonstiger Aufwand: keine zusätzlichen Server, die Datenbank verkraftet das problemlos.

## Was gebaut wird

1. **Eigenes Simulations-Thema** unter /sim, getrennt von echten Diskussionen; ein sichtbarer Hinweis/Banner kennzeichnet die Seite als Simulation mit KI-Teilnehmern.
2. **40 Personas** einmalig erzeugt: Name, Haltung, Ton, Streitlust, Offenheit — verteilt über alle Lager, damit der Graph realistisch aussieht.
3. **Öffentlicher Play-Button**: jeder Besucher darf starten. Ein Lauf dauert genau 90 Sekunden mit sichtbarem Countdown, danach stoppt alles automatisch.
4. **Tageslimit 4 Läufe** (gesamt, nicht pro Besucher): bei Erreichen zeigt der Button "Heute ausgeschöpft — morgen wieder" und ist deaktiviert. Zähler wird serverseitig geführt, Manipulation im Browser ändert nichts.
5. **Pro Takt (alle ~10 s)** wählt das System einige Gesprächspaare aus und lässt die KI für sie schreiben:
   - neue Chats starten oder bestehende fortsetzen,
   - Nachrichten im Stil der Persona,
   - gegenseitige Bewertungen (Respekt/Verständnis und Differenz) aktualisieren,
   - gelegentlich kommt ein neuer Teilnehmer mit neuer Meinung dazu.
6. Graph, Stream-Spirale und Punkte reagieren live wie bei echten Nutzern. Die Ergebnisse bleiben nach dem Lauf sichtbar (die Diskussion wächst also über die Tage).

## Sicherheitsgurte

- Läuft nur nach Play-Druck, hartes Ende nach 90 s, hartes Tageslimit von 4 Läufen — beides serverseitig erzwungen.
- Nur ein Lauf gleichzeitig (Sperre in der Datenbank): drückt ein zweiter Besucher Play, sieht er den laufenden Countdown statt eines neuen Laufs.
- Bei aufgebrauchtem Guthaben oder Fehlern stoppt die Simulation sofort und zeigt den Grund an.

## Technische Details

- Edge Function `sim-tick`: liest Simulationsstatus (`running_until`, Tageszähler), stoppt wenn abgelaufen; sonst ein gebündelter Aufruf an `openai/gpt-6-astra` (Responses, gestreamt, reasoning low) mit kompaktem Zustand (Personas der gewählten Paare, letzte Nachrichten) → strukturiertes JSON mit Nachrichten, Bewertungen, optional neuer Meinung; schreibt alles in die bestehenden Tabellen.
- Taktgeber: Self-Invocation mit 10 s Abstand, Tiefenbudget (max. 9 Hops), Lease-Lock, Weiterlauf nur wenn `running_until` in der Zukunft; Pause bei 402/403/wiederholtem 429.
- Edge Function `sim-control` (start/stop): prüft serverseitig Tageslimit und Einzellauf-Sperre, kein Login nötig.
- Tabelle `sim_state` (Status, Lock, Tageszähler, Pausegrund) + `sim_personas`; Demo-User via bestehendem `is_demo`-Mechanismus.
- UI: Play/Stop + Countdown im Simulations-Thema, Anzeige der verbleibenden Tagesläufe, DE/EN-Texte.
