## 1. Route cleanup

### Routes to remove

- `/about` → `About` page
- `/home` → currently redirects to `/tt` (legacy)
- `/eching` → `Splash` (marketing/ad landing)
- `/old-lp` → `OldLanding`
- `/chat` → already redirects to `/`
- `/tt` → `Home` (discovery/topic-list page) and `/tt/:topicId` (legacy redirect)

### Resulting routes

```
/                         → TT (single-topic immersive UI, primary topic)
/:topicId                 → TT (UUID or short code)
/topic/:topicId           → Index (legacy graph view, kept)
/auth                     → redirect to /
/admin                    → Admin
/legal                    → Legal
/t/:slug                  → TopicJoin
/test-diskussion          → TestDiskussion
*                         → NotFound
```

### Cleanup steps

- `src/App.tsx`: drop the six route entries + their imports (`Splash`, `OldLanding`, `About`, `Home`, `LegacyTTTopicRedirect`).
- `src/pages/Home.tsx`: update `Link to="/about"` (currently the only nav link) — remove the link entirely (About page is gone).
- `src/pages/Legal.tsx`: change `to="/tt"` → `to="/"`.
- `src/components/ConfigPanel.tsx`: remove the `to="/about"` link (or point to `/`).
- Delete files (no remaining imports): `src/pages/Home.tsx`, `src/pages/About.tsx`, `src/pages/Splash.tsx`, `src/pages/OldLanding.tsx`, `src/pages/Chat.tsx` (already orphaned).
- Update `.lovable/memory/routing/app-navigation-structure-v6.md`.

### Features that get lost (not yet ported to `/`)

1. **Topic discovery / multi-topic browser** (`Home.tsx`): grid of all active topics with opinion + chat counts, "Latest opinions" feed, MiniGraph thumbnails, sort by activity. (TT only swipes through the same topic list one at a time — no overview.)
2. **About page** (`About.tsx`): long-form "How it works", platform mission, feature explanations.
3. **Splash / `/eching**`: marketing landing page used for paid ad traffic, Facebook Pixel CTA tracking. Removing it breaks ad campaigns referencing this URL — confirm no live ads depend on it.
4. **OldLanding (`/old-lp`)**: previous DiscourseGraph landing — pure archive, no live use expected.
5. `**/chat**`: already a redirect to `/`, no functional loss.
6. `**/home` legacy redirect**: anyone with old bookmarks lands on 404 instead of being forwarded.

If any of these matter, we can add a 301-style redirect to `/` instead of deleting (let me know).  
-> Please preserve the minigraph thumbnails in a litlte file. All the rest can go. 

---

## 2. Re-implement "Rate some opinions" tour after first opinion (max 4)

Port the existing `Index.tsx` positioning tour into the TT flow:

- Trigger: when `hasOwnOpinion` flips from `false` → `true` for the active topic (i.e. user just submitted their first opinion).
- Show the same `PositioningTourCongrats` modal first ("Congrats! Want to rate a few opinions?").
- On accept, sequentially pick **up to 4** random opinions (excluding own + AI bot + already-seen). Set `TOUR_MAX_RATINGS = 4`.
- Each pick opens the `TTBottomPanel` with the disagreement scale (existing `highlightDisagreementScale` path) and `PositioningTourControls` (Next / Stop) anchored above the bottom panel.
- "Done" / "Stop" / pool exhausted → finish, persist `tt:positioning-tour-done:<topicId>` in localStorage so it doesn't re-trigger.

Implementation:

- New hook `src/hooks/useTTPositioningTour.ts` encapsulating tour state (active, seen set, pickRandom).
- Mount tour state in `src/pages/TT.tsx`; reuse existing `PositioningTourCongrats` and `PositioningTourControls` components unchanged (already i18n'd).
- Drives `selectedNode` the same way the onboarding tour already does.

---

## 3. Auto-subscribe bell on first opinion

In `TT.tsx`, when `hasOwnOpinion` transitions to `true` for `activeTopicId`:

- If `getPrefs(activeTopicId)?.enabled !== true`, call `setPrefs(activeTopicId, { enabled: true })` and dispatch `tt:subscription-changed`.
- `TTNotificationsBell` already listens to that event and will reflect the active state.
- No browser permission prompt here — the prompt rules (1st / 4th / 10th opinion) stay as already wired.

---

## 4. Show subscribed topics in notifications panel

In `src/components/tt/TTHeader.tsx` notifications dropdown:

- Compute `subscribedTopicIds = getSubscribedTopicIds()` and resolve titles via `useTTTopics()`.
- Add a top section "Subscribed topics" (i18n key `tt.subscribedTopics`) above the notification list.
- Render each as a small clickable pill (rounded, muted bg). Click → `navigate(\`/${topic.short_code ?? topic.id})` and close the dropdown.
- Re-read on `tt:subscription-changed` event so it updates live.

---

## 5. Empty chats sidebar copy

In `src/components/tt/TTSideTabs.tsx` (right panel empty state):

- Replace `t('tt.chatsEmpty')` text with new key `tt.chatsEmptyHint`:
  - EN: "Click on nodes to start a chat!"
  - DE: "Tippe auf einen Punkt, um zu chatten!"
- Add the keys to `src/i18n/locales/{en,de}.json`.

---

## 6. Animated own-node entrance — options

Pick one (default recommendation: **B**):

- **A. Pop-in scale**: scale from 0 → 1 with overshoot (spring stiffness 280, damping 14). Snappy, ~400 ms. Familiar TikTok-style "appear".
- **B. Drop from center pill** *(recommended)*: node starts at the center CTA position with `opacity: 0, scale: 0.4`, animates to its target (x, y) and full size in ~700 ms with easeOut. Tells the visual story "your opinion just took its place in the graph". Pairs nicely with the CTA collapsing.
- **C. Pulse + ripple**: instant placement, then 2 expanding ring pulses in `--primary` for 1.2 s. Calmer, no movement; good if movement feels distracting.
- **D. Type-on bubble**: bubble fades in first, opinion text types out character-by-character (~25 ms/char). Most "personal" but slower and risks layout jitter.

Implementation lives in `src/themes/signal/SignalNode.tsx` (and the equivalent City/Arcane node renderers if we want parity), gated by an `isFreshlyAdded` flag computed in `TTScreen` by comparing the user's opinion `created_at` against a "first seen" timestamp held in a ref.  
  
Yes, Option B please!

---

## 7. Misc UI cleanup

- **Remove "Diskussionsfrage" eyebrow** above the topic title in `TTHeader.tsx` (lines 196–198): delete the small uppercase `tt.discussionQuestion` `<div>` so only the topic title remains.
- **Bottom white-space / footer**: the TT route does not import `Footer`, so there is no React footer to remove. The most likely culprit on the user's 1205×875 desktop view is empty space inside the 480 px phone frame below the bottom panel. We will:
  - Audit the phone-viewport container in `TT.tsx` for any leftover padding / safe-area inset that's unused on desktop.
  - Ensure `TTBottomPanel`'s wrapper extends to the bottom edge with no gap (remove `pb-[env(safe-area-inset-bottom)]` overrun on non-mobile).
  If the user actually means a footer on a different page (e.g. `Home`), point it out and we'll handle it there — but `Home` is being deleted anyway.

---

## Files to edit / create

**Edit**: `src/App.tsx`, `src/pages/Legal.tsx`, `src/components/ConfigPanel.tsx`, `src/pages/TT.tsx`, `src/components/tt/TTHeader.tsx`, `src/components/tt/TTSideTabs.tsx`, `src/themes/signal/SignalNode.tsx`, `src/i18n/locales/en.json`, `src/i18n/locales/de.json`, `.lovable/memory/routing/app-navigation-structure-v6.md`

**Create**: `src/hooks/useTTPositioningTour.ts`

**Delete**: `src/pages/Home.tsx`, `src/pages/About.tsx`, `src/pages/Splash.tsx`, `src/pages/OldLanding.tsx`, `src/pages/Chat.tsx`

---

## Open question

Which **own-node entrance animation** do you want — A (pop), **B (drop from center, default)**, C (pulse), or D (type-on)? I'll implement only the chosen one.