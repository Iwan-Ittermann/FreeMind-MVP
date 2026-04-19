

## Plan: TikTok-style Mobile UI for FreeMind (`/tt` route)

### What I see in the mockup (3 frames, portrait phone)

**Frame 1 — Blank Home Screen**
- **Top-left**: `freemind` wordmark (small, lowercase, no icon).
- **Top-right**: small bell icon with red unread dot + door/exit icon (logout/leave).
- **Center top**: small label `Diskussionsfrage`, below it the topic title in large italic-ish serif: *"Was sagst du zu diesem Video?"* with `Video` underlined → tappable link back to the TikTok video.
- **Center**: the layered eye/iris background you uploaded — three concentric zones with labels overlaid: `respektvoll` (in dark core), `moderat` (mid blue ring), `Extrem` (faint, bottom of outer ring).
- **Left edge, upper third**: vertical tab labelled `MEINUNGEN` (Opinions sidebar trigger) — rounded right edge sticking out from the screen border.
- **Right edge, lower third**: vertical tab labelled `CHATS` — rounded left edge sticking out from the right border.
- **Bottom-left**: standalone bell icon (notifications panel trigger).
- **Bottom**: empty white strip — reserved for opinion input (appears in Frame 2).

**Frame 2 — Header buttons unfolded / no node selected**
- Same as Frame 1, plus:
- A **dropdown panel** unfolds from the top-right exit button area, listing recent activity items: `Neue Meinung → Topic`, `Neue Meinung → Topic`, **`Neue Nachricht`** (bold = unread) `→ Topic`. Each row is a clickable card with a Topic chip.
- A **second floating panel** below it: `Deine Passphrase:` with a pill-shaped passphrase field, four small icon buttons (copy, download, regenerate, show/hide), and a link `Du hast bereits eine Passphrase?`.
- **Bottom panel active**: input field placeholder *"Was ist deine Menung zu dem Thema?"* + `POSTEN` button (rounded outline). Replaces the empty strip from Frame 1.

**Frame 3 — Node Selected**
- Same chrome.
- Inside the graph: a hand cursor points at a small green node in the moderate ring; other dots scattered (green = moderate, yellow = respectful core, black = extreme).
- **Bottom panel** now shows the selected opinion:
  - Small flag/report icon top-right of the panel.
  - Opinion text: *"[Opinion Text] Ich finde das Video gut, denn es zeigt, dass jeder es schaffen kann, wenn er oder sie nicht aufgibt."*
  - **Emoji rating row**: 5 face emojis (😀😊😐🙁😠) — green→red gradient = the disagreement scale (replaces the slider).
  - **`Let's chat`** button bottom-right (rounded outline).

### Architecture decisions (with rationale)

| Question | Recommendation |
|---|---|
| Same project? | **Yes.** New route `/tt/:topicId?` mounts a dedicated `TTLayout`. Reuses all hooks (`useTopicData`, `useChatRequests`, `useAuth`, `useDisagreementRating`), the `OpinionGraph` engine, Supabase client, i18n. |
| Same database? | **Yes — same Supabase.** Same opinions, ratings, chats, users. The whole point of TikTok traffic is to feed the existing graph. Add a single `signup_source` column on `user_topics` later if you want analytics. |
| Width? | Lock to **mobile portrait** (max-width 480px, centered on desktop with dark gutters). No TikTok 810px constraint exists anymore — link stickers open the system browser at full device width. |
| Swipe up/down between topics? | **Architect for it now, build CSS only.** Wrap the screen in a vertical snap container (`overflow-y: scroll; scroll-snap-type: y mandatory`) where each topic is one `100dvh` snap section. Data-fetching per snap deferred to a later prompt. |
| PWA? | **Installable manifest only** (no service worker → avoids preview-iframe issues per project conventions). Add `display: standalone`, icons, theme color. Users get "Add to Home Screen". |

### Files to create

| File | Purpose |
|---|---|
| `src/pages/TT.tsx` | Route component, swipe-snap container, fetches topic(s), renders `TTScreen` per topic |
| `src/components/tt/TTScreen.tsx` | One full-viewport screen: background + graph + chrome + bottom panel |
| `src/components/tt/TTBackground.tsx` | The layered SVG background (reusable, accepts `seed` prop for variation per topic) |
| `src/components/tt/TTHeader.tsx` | Top wordmark, bell w/ dot, exit/passphrase dropdown |
| `src/components/tt/TTSideTabs.tsx` | Left `MEINUNGEN` tab (top-left) + right `CHATS` tab (bottom-right), each opens a slide-in sheet |
| `src/components/tt/TTBottomPanel.tsx` | Three states: empty/inline opinion input / selected-opinion view |
| `src/components/tt/TTEmojiRating.tsx` | 5-emoji disagreement picker (replaces slider, writes to same `opinion_ratings`) |
| `src/components/tt/TTNotificationsBell.tsx` | Bottom-left bell + panel |
| `public/tt-manifest.webmanifest` | PWA manifest scoped to `/tt` |

### Files to modify

| File | Change |
|---|---|
| `src/App.tsx` | Add `<Route path="/tt/:topicId?" element={<TT />} />` (no global `Header`, no `BottomTabBar` — TT layout is self-contained) |
| `index.html` | Conditionally link the manifest only when path starts with `/tt` (or always — harmless) |
| `src/i18n/locales/{en,de}.json` | Add `tt.*` keys: `discussionQuestion`, `respectful`, `moderate`, `extreme`, `yourOpinionPlaceholder`, `post`, `letsChat`, `opinions`, `chats`, etc. |

### SVG background — suggested improvements

Your SVG is solid. Small refinements I'd apply:
1. **Make the gap warmer / thinner** — currently 30px wide (r=320 minus r=290). At phone width that's prominent. Suggest r=300 (gap ~10px) to match the uploaded reference image where the cream ring is subtler.
2. **Per-topic color seed** — accept a `hue` prop that rotates the `g34` gradient stops (0–360°) so each swiped topic feels distinct while preserving the eye composition.
3. **Slight radial vignette on outer edge** — adds depth, matches the reference better than the flat linear gradient corners.
4. **Move the noise filter** to the cream gap too (very low opacity, ~0.04) to unify texture.
5. **Use `viewBox` + `preserveAspectRatio="xMidYMid slice"`** on the wrapper so it always covers the screen edge-to-edge in portrait.

### Layout sketch (portrait)

```text
┌────────────────────────────┐
│ freemind          🔔• 🚪  │  ← TTHeader (overlays graph)
│      Diskussionsfrage      │
│   Was sagst du zu diesem   │
│         Video?             │
│ ┌──┐                       │
│ │M │   ╭──── eye ────╮     │
│ │E │  (    moderat    )    │
│ │I │  (   ╭ resp ╮    )    │
│ │N │  (   ╰──────╯    )    │
│ │U │   ╰──── extrem ─╯     │
│ │N │                  ┌──┐ │
│ │G │                  │C │ │
│ │E │                  │H │ │
│ │N │                  │A │ │
│ └──┘                  │T │ │
│                       │S │ │
│ 🔔                    └──┘ │
├────────────────────────────┤
│ [bottom panel, 3 states]   │
└────────────────────────────┘
```

### Scope of THIS prompt (build now)
1. Route + skeleton page with vertical snap container (CSS only, single topic for now).
2. SVG background component with the improvements.
3. All chrome: header, side tabs (open empty sheets), bottom-left bell, bottom panel with 3 states.
4. Wire bottom panel to existing `useTopicData` + `submit_opinion` + `useDisagreementRating` (using new emoji rating).
5. Reuse existing `OpinionGraph` (signal theme) inside the eye, sized to the cream/moderate area.
6. i18n keys (EN/DE).
7. PWA manifest (no service worker).

### Out of scope (later prompts)
- Actual swipe-loading of next/prev topic data.
- TikTok link sticker integration (just a URL — no SDK).
- Pixel parity polish on each component.

