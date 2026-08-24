---
name: No overlap / no off-screen rule
description: Layout rule — UI elements must never overlap each other or extend beyond the screen edges
type: preference
---

Kein UI-Element darf ein anderes verdecken oder über den Bildschirmrand hinausragen.

**How to apply:**
- Overlays im TT/Discussion-Screen respektieren die feste Bodenzone: Impressum-Footer (33px) + untere Leiste (48px) = **ab bottom-[86px]**. Nichts darf darunter geparkt werden.
- Bekannte Slots: Legende `bottom-[86px]`, Auswahl-Panel `bottom-[84px]` (nur bei Auswahl), Nudges/CTA `bottom-[125px]`, Install-Hint `bottom-[118px]`.
- Elemente, die denselben Slot belegen, gegenseitig ausschließen (conditional render), nicht per z-index stapeln.
- Breite: `left-3 right-3` bzw. `max-w-full` + `flex-wrap`, damit Text nie seitlich abgeschnitten wird.
- Nach Layout-Änderungen an der unteren Leiste immer prüfen, ob darunter liegende Hinweise sichtbar bleiben.
