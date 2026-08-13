# Tab-UI, Pflicht-Meinung auf /test, neuer Bewerten-dann-Diskutieren-Flow

## 1. /test verhält sich wie /go (außer Zeitsteuerung)

- Auf `/test` gilt künftig ebenfalls: verifizierte Nutzer müssen zuerst eine Meinung abgeben, bevor Graph, Meinungsliste und Chats nutzbar sind (gleiche Sperr-Karte wie auf `/go`, Variante "submit").
- Kein Countdown, kein "Warten bis Diskussionsstart" auf `/test` — die Zeitphasen (`prelaunch`, `submission`) bleiben ausschließlich auf `/go`.
- Unverifizierte Nutzer sehen wie bisher den Hinweis "Registriere dich unter freemind.chat …" und dürfen nur lesen.

## 2. Tab-basierte UI (statt der zwei Pill-Buttons)

Drei gleich breite Tabs am unteren Rand, direkt über dem Impressum-Footer: **Meinungen · Graph · Chats**.

Empfehlung zur gestellten Frage: **Graph bleibt dauerhaft im Hintergrund gemountet, Meinungsliste und Chatliste legen sich als vollflächiges Overlay darüber.**

Begründung:
- Der Graph ist teuer (Layout-Berechnung, Polling, Animationen). Bei echten getrennten Frames würde er beim Tab-Wechsel neu aufbauen — Nodes springen, Animationen starten neu, es flackert. Genau diese Klasse von Fehlern hatten wir schon mehrfach.
- Das Overlay ist trotzdem deckend (voller Screen, keine Transparenz), fühlt sich also wie ein eigener Frame an.
- Wechsel zurück zum Graph ist sofort und ohne Ladezustand.

Verhalten:
- Overlays füllen die Fläche zwischen Header und Tab-Leiste vollständig aus (nicht mehr die kleine Karte), bleiben aber innerhalb des 480px-Rahmens.
- Tab "Graph" schließt jedes offene Overlay.
- Tippen auf eine Meinung in der Liste wechselt zum Graph-Tab und öffnet unten das Detail-Panel der Meinung.
- Chats-Tab bleibt gesperrt (ausgegraut), solange keine eigene Meinung vorliegt.
- Unread-Badge wandert auf den Chats-Tab.
- Die zentrale "Meinung abgeben"-CTA und das Meinungs-Detail-Panel bleiben Teil des Graph-Tabs.

## 3. Neuer Flow: erst bewerten, dann diskutieren

Im Meinungs-Detail-Panel (Graph-Tab):

1. Zuerst nur die Meinung + **5-stufige** Unterschieds-Skala (zurück von 11 auf 5 Stufen: 0 / 25 / 50 / 75 / 100, Label "Meinungsunterschied").
2. Darunter ein **OK**-Button. Erst ein Klick darauf speichert die Bewertung (kein Auto-Save mehr in diesem Panel).
3. Nach dem Speichern verschwindet die Skala, und erst dann erscheint der **Diskutieren**-Button.
4. Ist für diese Meinung bereits eine Bewertung gespeichert, wird direkt der Diskutieren-Button gezeigt (mit kleiner Möglichkeit, die Bewertung erneut zu öffnen).

Die gleiche Logik in der Meinungsliste kommt laut Absprache im nächsten Schritt — hier nur im Detail-Panel.

## Technische Umsetzung

- `src/pages/Discussion.tsx`: `gated`-Logik so ändern, dass `mode === 'test'` die Sperre "eigene Meinung nötig" ebenfalls auslöst, Zeitphasen aber übersprungen werden (`gateVariant` für Test nur `'submit'`).
- `src/components/tt/TTSideTabs.tsx` → wird zu einer Tab-Leiste plus Vollflächen-Overlay (Tabs `opinions | graph | chats`, aktiver Tab als State, Graph-Tab = kein Overlay). Panel-Höhe von `min(60vh, 520px)` auf "Header bis Tabbar" umstellen.
- `src/components/tt/TTEmojiRating.tsx`: `STEPS` auf `[0, 25, 50, 75, 100]` reduzieren, Grid entsprechend `grid-cols-5`, größere Touch-Targets.
- `src/components/tt/TTBottomPanel.tsx`: zweistufiger Zustand (`rating` → `chat`), OK-Button, Diskutieren-Button erst nach Bestätigung.
- `src/hooks/useOpinionRating.ts`: neben dem Debounce-Auto-Save eine explizite `saveNow(value)`-Funktion ergänzen (bestehendes Verhalten für andere Aufrufer bleibt erhalten).
- Neue i18n-Keys (DE/EN) für Tab-Titel, OK-Button und den Hinweis "Bitte erst den Meinungsunterschied bewerten".
- Bestehende Bewertungen bleiben unverändert; die 5 Stufen mappen auf dieselbe 0–100-Spalte, ältere Werte werden auf die nächste Stufe gerundet dargestellt.
