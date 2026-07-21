# Event build — header polish & help overlay

Scope: `src/components/tt/TTHeader.tsx`, `src/components/tt/TTScreen.tsx`, `src/pages/EineWocheEineFrage.tsx`, plus one new component `TTHelpOverlay.tsx` and translation keys in `src/i18n/locales/{de,en}.json`. Nothing outside the event build changes: gating everything behind `SINGLE_TOPIC_MODE` where behavior differs.

## 1. Move the notifications on/off toggle into the panel

- Delete the standalone floating `TTNotificationsBell` (`bottom-[8.5rem] left-3`) in single-topic mode — the event UI already renders the bell in the header.
- Inside the header notifications dropdown (`TTHeader.tsx`, "Notifications" header row), add a subscribe toggle (Bell / BellOff) sitting next to the existing filter (SlidersHorizontal) button. Reuses `getPrefs/setPrefs` + `tt:subscription-changed` event, exactly like the current `TTNotificationsBell`.
- The header bell icon keeps its dot indicator; clicking it just opens the panel (no permission prompt — already the case).

## 2. Replace the "settings" icon with a gear

- The current `DoorOpen` icon in the header (the account/menu button) is what the user refers to as "settings". Swap it for `Settings` (lucide gear). The `X` close state stays.
- Rename its `aria-label` to `t('tt.settings')` 

## 3. Align topic question to the header line

- In `TTHeader.tsx`, drop the top gradient overlay height / spacing so the `<h1>` topic sits flush directly under the row containing `freemind` and the icons. Concretely: remove the `mt-3` gap and add a thin border-bottom to the header row (or a divider div), so the question renders immediately below the header baseline with tight padding (e.g., `pt-2 pb-3` on the question, no extra margin).

## 4. Hide zone labels

- In `TTScreen.tsx`, remove (or wrap in `!SINGLE_TOPIC_MODE`) the three `<span>` zone labels ("Extrem", "Moderat", "Respektvoll"). The help overlay (below) is what introduces the zone meaning to users now.

## 5. Add a header help button + guided overlay

### Header button

- Add a `CircleHelp` icon-button in `TTHeader.tsx`, placed leftmost in the icon cluster (order: help → bell → gear). Prop-driven: `onOpenHelp: () => void` passed from `EineWocheEineFrage.tsx`.

### Overlay component `src/components/tt/TTHelpOverlay.tsx`

New full-screen overlay, z above header (z-[80]), dimmed backdrop (`bg-black/55`), single dismiss button (X, top-right) and tap-anywhere-on-backdrop to close.

Highlighting model:

- On mount, query DOM for the target of each callout (via `data-tt-help` attributes we'll add to existing elements). For each found target, compute a `getBoundingClientRect()` and render:
  - A soft radial "spotlight" ring around the element (SVG or box-shadow trick), non-interactive.
  - A small label card ("Liste aller Meinungen" etc.) positioned adjacent to the element, connected by a short arrow (an inline SVG line + arrowhead).
- Recompute on `resize` and once after a 200 ms delay (nodes animate in).
- Overlay is purely presentational — it does not interact with the underlying elements; all clicks close it.

### Callouts (each localized EN/DE)


| Target selector                                                                                  | German label                | English label      |
| ------------------------------------------------------------------------------------------------ | --------------------------- | ------------------ |
| Left opinions tab (`TTSideTabs` left button) — add `data-tt-help="opinions-tab"`                 | "Alle Meinungen"            | "All opinions"     |
| Right chats tab (`TTSideTabs` right button) — add `data-tt-help="chats-tab"`                     | "Deine Chats"               | "Your chats"       |
| Header gear button — add `data-tt-help="settings"`                                               | "Einstellungen & Anleitung" | "Settings & guide" |
| Up to 3 random other-user opinion nodes (SVG `g[data-node-id]` where node is not the user's own) | "Meinungen von Anderen"     | "Others' opinions" |
| The user's own opinion node (if it exists)                                                       | "Deine Meinung"             | "Your opinion"     |
| Respectful zone (blue inner ring)                                                                | "Hohe Punktzahl"            | "High score"       |
| Extreme zone (outer ring)                                                                        | "Negative Punktzahl"        | "Negative score"   |


Selection logic for the 3 random opinion callouts: run once when the overlay opens using a seeded shuffle over `data.opinions` filtered by `authorId !== user.id`, take up to 3; if fewer exist, use what's available.

Zone callouts: derive positions from the same `phoneViewportW` math already used in `TTScreen.tsx` (center + `phoneViewportW * 0.235` for respectful, `* 0.62` for extreme) rather than DOM measurement.

### Wiring in `EineWocheEineFrage.tsx`

- New state `helpOpen`.
- Pass `onOpenHelp={() => setHelpOpen(true)}` into `TTHeader`.
- Render `<TTHelpOverlay open={helpOpen} onClose={() => setHelpOpen(false)} opinions={activeData?.opinions ?? []} ownOpinionId={visibleOwnOpinionId} />`.

## 6. i18n

Add to `src/i18n/locales/de.json` and `en.json`:

- `tt.help.open` — aria-label for the help button
- `tt.help.opinionsTab`, `tt.help.chatsTab`, `tt.help.settings`, `tt.help.otherOpinions`, `tt.help.yourOpinion`, `tt.help.highScore`, `tt.help.negativeScore`
- `tt.settingsAndGuide`
- `tt.notifySubscribeOn`, `tt.notifySubscribeOff` (for the in-panel toggle label)

## Out of scope

- No changes to underlying notification logic, chat routing, or graph layout.
- No dark-mode-only styling changes beyond the icon swap and label removal.
- Multi-topic build behavior stays unchanged (zone labels remain visible, floating `TTNotificationsBell` stays, `DoorOpen` icon stays) — every visual change is either gated by `SINGLE_TOPIC_MODE` or additive.