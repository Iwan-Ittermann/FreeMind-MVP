## UI Improvements

### 1. Bell never asks for browser permission
- `TTNotificationsBell` (left bell): remove `requestBrowserNotificationPermission()` call. Toggle just flips `setPrefs(topicId, { enabled })` so the topic's notifications appear in the panel. If permission happens to be granted, browser notifications fire too — but we never prompt here.
- Audit other entry points (`useBrowserNotification`, `TTNotificationSetup`) — none are currently mounted in `/`, but to be safe we keep them but ensure they're not invoked from the bell flow.

### 2. Permission only on 1st / 4th / 10th opinion
- In `TTBottomPanel.handleSubmit`, replace the unconditional `requestBrowserNotificationPermission()` with a counter-based gate.
- Store `tt:opinion-submit-count` in localStorage. After a successful `submit_opinion`, increment. If new count is 1, 4, or 10 AND `Notification.permission === 'default'`, then call `requestBrowserNotificationPermission()`. Otherwise no prompt.
- On grant, call `enableTopicNotifications(topicId)` for the just-posted topic (as today).

### 3. Notification panel: per-topic sections
- Add `topicId` field to `TTNotification` type.
- `useTTNotifications`: include `topicId` on every emitted notification (already known in each handler).
- For "new topic" events keep `topicId` as the new topic so it groups under itself.
- `TTHeader` bell dropdown: group `notifications` by `topicId`. Resolve a title via `useTTTopics()` (lookup map). Render a small section header (topic title) above each group; "Other" fallback if title missing.
- Empty state unchanged.

### 4. Zone labels — always readable, circular alignment
- In `TTScreen.tsx`, restyle the three absolute labels:
  - Add a subtle backdrop chip (`bg-background/55 backdrop-blur-sm rounded-full px-2 py-0.5`) so they're legible on any background hue.
  - Slightly stronger text color (`text-foreground/80`).
- Reorder vertically (top → bottom): **Extrem** (above white ring) → **Moderat** (between blue and white rings) → **Respektvoll** (center).
  - Extrem: `top: calc(50% - viewportW * 0.62)` (above the outer white ring)
  - Moderat: `top: calc(50% - viewportW * 0.40)` (between blue and white rings)
  - Respektvoll: `top: 50%` (dark core center)
- All centered with `left-1/2 -translate-x-1/2 -translate-y-1/2` so they sit on the same vertical axis through the rings — supporting the circular composition.

### 5. Remove "Tippe auf einen Punkt …" hint
- In `TTBottomPanel`, the final `return` block (the State 3 hint card) renders the `tt.tapNodeHint` panel. Replace with `return <>{selectedOpinionPanel}{report dialog}</>` — same as the `suppressHintPanel` branch. Keeps panel UI clean.

### 6. Sidebars vertically centered, slightly offset
- `TTSideTabs`:
  - Left "Opinions" tab: change `top-[22%]` → `top-[55%] -translate-y-1/2` (slightly below center).
  - Right "Chats" tab: change `bottom-[28%]` → `top-[45%] -translate-y-1/2` (slightly above center).
- Mirror the panel anchoring so the expanded panels also align around the center:
  - Left panel `style={{ top: '55%', transform: 'translateY(-50%)', height: '60vh', maxHeight: 520 }}` (and remove `bottom`).
  - Right panel `style={{ top: '45%', transform: 'translateY(-50%)', height: '60vh', maxHeight: 520 }}`.
- Keep `transformOrigin` for the open animation.

### 7. White "YOU" inside red user node
- In `src/themes/signal/SignalNode.tsx`, when `ttMode && token.isCurrentUser`, render a centered "YOU" text inside the node shape:
  - Add `<text x="0" y="0" textAnchor="middle" dominantBaseline="central" fill="#FFFFFF" fontSize="9" fontWeight="bold" fontFamily="monospace">YOU</text>` after the `<Shape />` SVG, positioned at node center (translate(0,0) inside the outer `g`).
  - Remove the now-redundant suppression of the corner "YOU" badge in TT mode (keep it suppressed — center label is enough).

### Files to modify
- `src/components/tt/TTNotificationsBell.tsx`
- `src/components/tt/TTBottomPanel.tsx`
- `src/components/tt/TTHeader.tsx` (grouped notifications + `TTNotification` type extension)
- `src/hooks/useTTNotifications.ts` (carry `topicId`)
- `src/components/tt/TTScreen.tsx` (zone label restyling)
- `src/components/tt/TTSideTabs.tsx` (vertical centering)
- `src/themes/signal/SignalNode.tsx` (white "YOU" in red node)
