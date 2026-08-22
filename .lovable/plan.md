# Kosmos-Hintergrund als Alternative zum Auge

Der Graph bekommt einen zweiten, wählbaren Hintergrund im Stil des Homescreen-App-Icons: dunkles Weltall, faseriger blauer Sternenring, glühender Bernstein-Kern, feine Sternpunkte. Umschaltbar im Zahnrad-Menü, pro Gerät gespeichert — wie der bestehende Pfeil-Schalter.

## Was der Nutzer bekommt

- Neuer Eintrag im Zahnrad-Menü: „Hintergrund: Auge / Kosmos" (EN: „Background: Eye / Cosmos").
- Auswahl gilt sofort, ohne Reload, und bleibt auf dem Gerät gespeichert (Default bleibt „Auge").
- Der Kosmos-Hintergrund sitzt exakt auf denselben Ringen wie heute, damit die Knoten-Positionen unverändert stimmen:
  - Kern/Pupille bei Radius 140
  - Blauer Ring (Nullpunkt-Radius) bei 300
  - Außenbereich ab 300 — im Kosmos-Look statt weißer Sklera ein dunkles Sternenfeld mit weichem Blaunebel

## Aufbau des Kosmos-Looks

Kein Ausschnitt aus der PNG-Datei des Icons (zu klein, gerundeter Rahmen, feste Ränder). Stattdessen ein passendes, hochauflösendes Hintergrundbild im Icon-Stil, das mittig in denselben 1000er-Rahmen gelegt und mit SVG-Glows kombiniert wird:

1. Neues Bild-Asset (quadratisch, radial-symmetrisch, transparenter oder tiefdunkler Rand) im Look des App-Icons: blauer Faserring, orange-goldener Kern, Sternpunkte.
2. Das Bild wird so skaliert, dass der Faserring auf Radius 300 fällt und der Kern auf 140.
3. Darüber liegen dieselben SVG-Elemente wie heute für Tiefe: leichtes Korn, weicher Kern-Glow, feiner Ringschimmer bei 300 als Orientierungslinie.
4. Falls das Bild nicht lädt, greift ein rein per SVG gezeichneter Kosmos-Fallback (dunkelblauer Radialverlauf + Ringglow), damit nie ein leerer Hintergrund entsteht.

Die Knoten-, Kanten- und Pfeil-Darstellung bleibt unverändert; nur die Hintergrundschicht wechselt.

## Technische Umsetzung

- `src/hooks/useBackgroundPref.ts` (neu): `localStorage`-Key `tt-bg-style` mit Werten `eye` | `cosmos`, plus Custom-Event zur sofortigen Synchronisierung — analog zu `useArrowModePref.ts`.
- `src/components/tt/TTBackground.tsx`: neue Prop `variant`. Bisheriges Auge bleibt unverändert; für `cosmos` eine zweite Render-Variante mit Bild-Layer (`<image>` im SVG bzw. CSS-Background) und den Glow-/Grain-Layern. Radien 140/300/360 und die Skalierungslogik (`viewportWidth / 0.6`) bleiben identisch.
- `src/components/tt/TTScreen.tsx`: liest die Präferenz und gibt `variant` an `TTBackground` weiter; Memo-Vergleich (`prev.hue === next.hue`) um die Variante erweitern.
- `src/components/tt/TTHeader.tsx`: neuer Menüpunkt im Zahnrad-Panel direkt unter dem Pfeil-Schalter, gleiche Optik (zwei Optionen bzw. Umschalter mit Häkchen).
- `src/assets/`: neues Hintergrundbild (Bildgenerierung im Icon-Stil), als ES6-Import eingebunden.
- `src/i18n/locales/de.json` und `en.json`: Schlüssel für Label und Optionsnamen.
