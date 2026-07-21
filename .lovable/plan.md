## Goal

Ship a **single-topic event build** of the graph app, driven by a compile-time env flag, plus a new **Nebula** deep-space theme that fits the circular design language. Remove the scroll indicator on the way through.

---

## 1. Single-topic mode (env flag)

New env vars in `.env.local` (only set on the event deploy):

```
VITE_SINGLE_TOPIC_MODE=true
VITE_SINGLE_TOPIC_SHORT_CODE=xxxx
```

New module `src/lib/single-topic.ts` exposes:
- `SINGLE_TOPIC_MODE: boolean`
- `SINGLE_TOPIC_SHORT_CODE: string | null`
- `useSingleTopicId()` — resolves short_code → topic_id via existing topic query.

### What the flag changes

**Routing (`App.tsx`)**
- When `SINGLE_TOPIC_MODE` is on: `/` renders the topic screen directly (skip Landing).
- Redirect any `/xxxx` short-code URL that doesn't match the configured topic → `/`.
- Keep `/legal`, `/unsubscribe`, `/admin2`, `/confirm` routes intact (needed for compliance + admin).
- Remove/no-op: `/eine-woche-eine-frage`, `/test-diskussion`, and the discovery/topic-picker sub-routes.

**Header (`Header.tsx` / `TTHeader.tsx`)**
- Hide topic-list dropdown and topic switcher.
- Hide language switcher (locked to `de`, forced via `i18n.changeLanguage('de')` on boot when flag on).
- Keep: notification bell, user menu, help.

**Notification system**
- Auto-subscribe user to the single topic on first authenticated load (idempotent insert into `user_topics`).
- Bell panel: collapse the "sections per topic" layout — render one flat list, drop the topic pills / topic header. Behavior otherwise unchanged.
- Browser permission gating unchanged (1st/4th/10th opinion).

**Chats sidebar (`ChatsSidebar.tsx`)**
- No topic grouping needed (only ever one topic's chats). Ensure the query is scoped to the single topic id, drop any topic label from chat rows.
- Empty-state copy unchanged.

**Opinions sidebar (`OpinionsSidebar.tsx`)**
- Already scoped per-topic; no logic change. Verify no topic-switching UI is exposed.

**Removed UI**
- Scroll indicator in `TT.tsx` (the vertical hint arrow/snap chevron).
- Any "next topic" affordance or vertical snap-to-next-section — the event build has nothing to scroll to.

**Admin**
- `/admin2` still works. `/admin` (multi-topic dashboard) route stays but is unlinked from the event UI.

### Data / backend

No schema changes. No new tables. Event participants and public users share the same `topics`, `opinions`, `chats` tables — isolation is at the routing/UI layer. If you later want data isolation, that's a separate remix (flagged as an option we explicitly did **not** take today).

---

## 2. Nebula deep-space theme

New theme name `nebula` alongside `signal | city | arcane | classic`.

**Palette (added under a new `.nebula-theme` scope in `index.css`, HSL from your picks):**
- Background: `#0a0524` (deep violet-black)
- Mid-space: `#3d1a5c` (nebula core)
- Primary/accent: `#c44ec9` (magenta star)
- Highlight: `#f5c4ff` (starlight)
- Plus derived tokens: `--nebula-cyan: #4ec9e0`, `--nebula-gold: #ffd27a` for edge/rating differentiation.

**Renderer**: new `src/themes/nebula/NebulaRenderer.tsx` mirroring `SignalRenderer` shape. Reused pieces from Signal (layout, node/edge geometry, TT mode). What changes visually:

- **Backdrop**: three stacked radial gradients (deep violet → magenta core → transparent) + a fine star-field SVG layer (deterministic seeded dots, 3 sizes, subtle twinkle via CSS `@keyframes`).
- **Zones (concentric circles)** re-read as **orbital rings**:
  - Extreme = faint outer orbit, dashed, `--nebula-cyan / 0.25`
  - Moderate = mid orbit, solid thin, `--nebula-gold / 0.3`
  - Respectful = inner "core" ring with soft magenta glow
  - Zone labels: thin uppercase, letter-spaced, placed on the ring path (SVG `<textPath>`) so they follow the circle — reinforces the orbital metaphor.
- **Nodes** = stars:
  - Default: small white circle + soft magenta halo (`filter: blur(4px)` sibling).
  - Online: brighter halo, gentle twinkle (opacity 0.7↔1, 3s).
  - Current user's node: replace red disc with a magenta-cored star, `YOU` in white, subtle rotating chromatic aberration ring.
  - Active-chat glow: expanded magenta+cyan halo (keeps the existing "chat glow" behavior).
- **Edges** = light-year threads:
  - Accepted: thin magenta line with a moving 1px cyan dot along its path (SVG `animateMotion`) at low frequency (one traverse every ~8s).
  - Pending: dashed cyan, low opacity.
- **Message dots**: shift to small cyan/starlight sparks with a short tail.
- **Center CTA**: pill gets a magenta-to-cyan gradient border, glass background (`backdrop-blur` + `rgba(10,5,36,0.55)`).

Selectable from `/admin` ThemePanel via the existing `active_theme` app-setting (no schema change; add `nebula` to the enum-of-strings the panel already writes).

Default theme for the event build: `nebula` (set in `ThemeContext.tsx` fallback when `SINGLE_TOPIC_MODE` is on and `active_theme` hasn't been overridden).

---

## 3. Implications audit — what stays safe

| Area | Behavior under single-topic |
|---|---|
| Chat sidebar | One topic → flat list, no grouping. Auto-scoped. ✅ |
| Notifications | Auto-subscribe on load; flat list in panel; permission gating unchanged. ✅ |
| Opinions sidebar | Already topic-scoped; unchanged. ✅ |
| Positioning tour (rate 4 opinions) | Unchanged — triggers on own opinion submit. ✅ |
| Auth / signup / confirm emails | Unchanged. ✅ |
| Admin2 dashboard | Reachable at `/admin2`, not linked from UI. ✅ |
| Fake nodes | Continue to work; admin can seed via `/admin`. ✅ |
| Legal / Unsubscribe / Impressum | Routes preserved. ✅ |
| i18n | Locked to `de`; English strings still compile but unused. ✅ |

---

## 4. Deliverables

Files touched:
- `src/lib/single-topic.ts` (new)
- `src/App.tsx` — flag-aware routing
- `src/pages/TT.tsx` — remove scroll indicator, disable snap-to-next when flag on
- `src/components/Header.tsx`, `src/components/tt/TTHeader.tsx` — hide topic/lang switchers
- `src/components/tt/TTNotificationsBell.tsx` — flat list when flag on
- `src/components/ChatsSidebar.tsx` — verify single-topic scoping, drop topic labels
- `src/hooks/useTopics.ts` / auto-subscribe hook — idempotent join on mount
- `src/i18n/config.ts` — force `de` when flag on
- `src/themes/nebula/NebulaRenderer.tsx` + supporting files (Node/Edge/Zones/EventMarker mirroring `signal/`)
- `src/themes/ThemeContext.tsx`, `src/themes/types.ts` — add `nebula`
- `src/components/admin/ThemePanel.tsx` — add Nebula option
- `src/index.css` — `.nebula-theme` tokens + starfield keyframes
- `.env.example` — document `VITE_SINGLE_TOPIC_MODE`, `VITE_SINGLE_TOPIC_SHORT_CODE`

No DB migrations. No new secrets.

---

## 5. Deployment note (heads-up, not in code)

You'll create the event topic via `/admin` (existing flow), copy its 4-char `short_code`, and set `VITE_SINGLE_TOPIC_SHORT_CODE=<code>` on the event's Lovable project (remix or a separate publish). The main site stays untouched.
