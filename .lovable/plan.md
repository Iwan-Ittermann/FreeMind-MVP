## Plan: TT UI Polish v2 — Parallax, Silent Auth, Panel Refinements

### 1. Parallax swipe (graph moves, chrome stays)

**Problem**: Currently each `TTScreen` is a full snap section containing both graph AND chrome — so header/tabs/bottom panel re-render on every swipe (= shake/flash).

**Fix**: Restructure `TT.tsx`:

- **Persistent chrome layer** (single instance, fixed): `TTHeader`, `TTSideTabs`, `TTNotificationsBell`, `TTBottomPanel`. Driven by a shared `activeTopicId` state.
- **Scroll layer** (snap container): only contains backgrounds + graphs, one per topic. Each section = `TTScreenInner` (background + graph only, no chrome).
- **Parallax**: in `TTScreenInner`, use `useScroll` + `useTransform` from Framer Motion to translate the graph at a slower rate (e.g. 0.7x) than the background (1x) as the section enters/leaves the viewport. Only the graph layer animates `y`.
- **Performance**: `will-change: transform` on graph wrapper, `contain: layout paint` on each section, memoize `TTScreenInner` per topicId.

Result: chrome never unmounts → no flash; only graph slides with subtle parallax.

### 2. URL per topic

**Already works**: route is `/tt/:topicId?` and `IntersectionObserver` updates URL via `navigate('/tt/:id', { replace: true })`. TikTok stickers can link to `https://freemind.chat/tt/<topic-uuid>` directly.

**Improvement**: support `url_slug` too — accept `/tt/:idOrSlug`, resolve in `TT.tsx` (look up by slug if not a UUID). More shareable.

### 3. Links in headline

Currently: `topicTitle.split(/\b(Video|video)\b/)` only links the literal word "Video".

**Fix**: support markdown-style links `[label](url)` in `topics.title`. Parse with a tiny regex in `TTHeader`, render `<a>` for matched segments. Backwards-compatible (titles without `[..](..)` render plain). No DB change needed.

### 4. Opinion panel polish

File: `TTBottomPanel.tsx` (selected-opinion state) + `TTEmojiRating.tsx`.

- **Colored emojis**: replace neutral faces with naturally-colored ones — `🟢 🟡 🟠 🔴 ⚫` OR keep face concept with gradient-tinted unicode: `💚 🙂 😐 😟 💢`. Best balance: use **circle emojis** (`🟢🟡🟠🔴⚫`) — universally rendered with native color, no backdrop needed.
- **Size + layout**: shrink emojis from `text-2xl aspect-square w-full` → `text-base`, place inline in a single row with the "Let's chat" button on the right. Drop circular backdrops entirely.
- **Scale labels**: tiny `text-[9px] text-muted-foreground` under the row — left "Fully agree" / right "Fully disagree" (i18n keys).
- **Button**: remove `MessageCircle` icon from "Let's chat".
- **Centered opinion text + responsive font**: wrap text in flex-center container; compute font size from char count — short text (<60 chars) → `text-xl`, medium (<150) → `text-base`, long → `text-sm`. Use a small util `getOpinionFontSize(len)`.
- **Report button**: wire to existing `ReportDialog` component (already used in `BottomPanel.tsx`) — open with `contentId=opinion.id`, `contentType='Opinion'`.
- **Click-outside close**: `TTScreen` listens for clicks on the background/graph area; if `selectedNode` is set and click target isn't inside the bottom panel or a node, call `setSelectedNode(null)`. Existing `OpinionGraph` already deselects on background click — ensure that propagates up.

### 5. Opinions list

**Problem**: `TTSideTabs` opens panels but content is empty/broken.

**Fix**: render an actual list inside the left "Opinions" panel:

- Reuse data from `useTopicData(activeTopicId).opinions`.
- Sort by FreeMind score (existing sort util) or by created_at desc.
- Each row:  opinion text (truncated), tap → set `selectedNode` + close panel.
- Right "Chats" panel: list user's accepted chats for this topic (reuse `useChatRequests` data).

### 6. Account dropdown fixes (`TTHeader.tsx`)

- **Eye icon bug**: button currently inside `accountRef`, click triggers outside-handler? Actual cause likely: `setShowPhrase` inside a button that has no `e.stopPropagation()`. Fix: ensure the eye button is inside `accountRef` (it is) and stop propagation isn't needed — real cause is probably the click-outside handler firing because the button is rendered inside `<AnimatePresence>` which exits on state change. **Investigation needed in default mode**, but likely fix: move `showPhrase` toggle into a stable child with `e.stopPropagation()` on the click handler.
- **Remove "Konto wechseln" link copy**: the `tt.alreadyHavePassphrase` button — leave the AuthForm trigger but rename or remove the toggle text. 
- **Remove regenerate button**: drop the `RefreshCw` button from the passphrase row.

### 7. Silent auth (deferred until first opinion)

**Current**: `TTBottomPanel` shows `AuthForm` when not logged in → "loslegen" button required.

**New flow**:

1. On `/tt` mount: if no session, **do nothing** — render the UI in browse mode. The textarea is visible and usable. Side panels / ratings / chat actions remain visible but inert.
2. On first opinion submit: silently call `supabase.auth.signUp({ email: <generated>@freemind.local, password: <passphrase> })`, wait for session, then call `submit_opinion`. No UI shown unless it fails.
  &nbsp;
3. Header dropdown still shows the passphrase (now backed by the auto-generated identity), with "Du hast bereits eine Passphrase?" → inline AuthForm to switch identity.

**Cost note**: this matches the original recommendation — `auth.users` rows are only created once a user contributes, keeping bounce traffic free.

**Files**: new helper `src/lib/silent-auth.ts` (`ensureSilentAuth(): Promise<User>`), called from `TTBottomPanel` opinion submit + emoji-rating + chat-request handlers.

### 8. Files to change


| File                                  | Change                                                                                                                                          |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/pages/TT.tsx`                    | Restructure: persistent chrome + scroll-only-graphs layer, parallax via `useScroll`, slug→id resolution                                         |
| `src/components/tt/TTScreen.tsx`      | Split into `TTScreenInner` (graph+bg only) + chrome moved up to `TT.tsx`                                                                        |
| `src/components/tt/TTBottomPanel.tsx` | Selected-opinion redesign (centered text, inline emoji+button row, scale labels, report wired, no icon, responsive font), silent-auth on submit |
| `src/components/tt/TTEmojiRating.tsx` | Smaller, no backdrop, colored circles, inline layout                                                                                            |
| `src/components/tt/TTHeader.tsx`      | Markdown link parsing, eye-icon stopPropagation fix, remove regenerate, remove "Konto wechseln" copy                                            |
| `src/components/tt/TTSideTabs.tsx`    | Wire opinions list (left) + chats list (right)                                                                                                  |
| `src/lib/silent-auth.ts` (new)        | `ensureSilentAuth()` helper                                                                                                                     |
| `src/i18n/locales/{en,de}.json`       | New keys: `tt.fullyAgree`, `tt.fullyDisagree`, `tt.opinions`, etc.                                                                              |


### 9. Out of scope (later)

- Caching parallax positions across navigation history.
- Slug resolution UI (only direct route works for now).
- Persisting opened panels across topic swipes.