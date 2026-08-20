# Aktive Knoten sichtbar machen, Bewertung ohne Vorauswahl, kreativere Chat-Namen

## 1. Aktiv vs. inaktiv im Kreis

Heute unterscheidet sich ein Knoten ohne Chats nur durch leicht reduzierte Deckkraft (0,45) — auf dem dunklen Hintergrund praktisch unsichtbar. Es kommen zwei getrennte, klar lesbare Marker dazu:

**A) „Diskutiert" (hat Chats/Punkte)**
- Aktive Knoten: volle Deckkraft plus dezenter Glow-Ring in Zonenfarbe.
- Inaktive Knoten (noch keine Punkte, sitzen auf dem äußersten Ring): deutlich schwächer (Deckkraft ~0,3), gedämpfte graublaue Füllung und dünner gestrichelter Umriss statt Vollfläche — sofort als „noch nicht im Gespräch" erkennbar.

**B) „Gerade online"**
- Kleiner pulsierender grüner Punkt oben rechts am Knoten (nicht beim eigenen Knoten).
- Nur Präsenz-basiert, unabhängig von A — ein Knoten kann online und inaktiv sein.

Zusätzlich eine kurze Legende (Punkt = online, gedimmt = noch keine Diskussion) unauffällig im Kreis-Bereich, i18n DE/EN.

## 2. Verständnis-Bewertung ohne Vorauswahl

Im Chat wird die Bewertung beim Öffnen einer neuen Runde auf `0` gesetzt — `0` ist gleichzeitig die Stufe „gar nicht", daher sieht sie vorausgewählt aus. Fix: der Startzustand wird „nichts gewählt", keine der fünf Stufen ist hervorgehoben, bis der Nutzer klickt. Gleiches Verhalten in der Popup-Variante der Bewertung.

## 3. Kreativere, unterschiedlichere Chat-Namen

Die Namen werden pro Chat einzeln erzeugt, ohne Kenntnis der bereits vorhandenen Namen — daher Wiederholungen und ähnliche Muster.
- Die Namensgenerierung erhält die bereits vergebenen Namen des Themas als „bitte klar davon unterscheiden"-Liste.
- Mehr Variation: höhere Kreativität (Temperature), Vorgabe wechselnder Stilrichtungen (Metapher, Wortspiel, Duell-Name, Bild aus Natur/Technik/Alltag) statt eines Standardmusters.
- Wenn der erzeugte Name einem bestehenden zu ähnlich ist, wird einmal neu generiert; erst dann greift der Fallback.

## Technische Details

- `src/themes/signal/SignalNode.tsx`: Deckkraft-/Füll-Logik für `token.isInactive`, gestrichelter Umriss, Online-Punkt aus `token.isOnline` (bereits im Token vorhanden), Glow für aktive Knoten. Rein Präsentation, keine Layout-Änderung — Determinismus bleibt unberührt.
- Legende: kleine Komponente im TT-Screen unter dem Kreis; Texte in `src/i18n/locales/de.json` / `en.json`.
- `src/components/chat/EmbeddedChatView.tsx`: `empathy`-State auf `number | null`, Reset auf `null` pro Runde, `isActive`-Vergleich entsprechend; Speichern erst bei Klick (unverändert). Analog `FloatingChatWindow.tsx` (kein Default 0 vorausgewählt).
- `supabase/functions/generate-chat-title/index.ts`: vor dem Prompt die vorhandenen `chats.title` des Themas laden, in den System-/User-Prompt aufnehmen, `temperature` erhöhen, Stil-Rotation per Hash der Chat-ID, Ähnlichkeitsprüfung (normalisierter Vergleich) mit einem Retry.
