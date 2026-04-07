# Round 2: UX Polish + Chat Features

Remaining features from the original list, excluding the completed Graph & Layout batch.

---

## Features in this round

1. **Flip disagree scale** — higher disagreement = slider right. Add round save button with checkmark.
2. **Kill signup redirect toast** — remove the "you are redirected" toast after signup.
3. **Remove tutorial "click two opinions" step** — drop the `exploreOpinions` step from onboarding.
4. **Add round save button to respect rating** — same circular check button in chat's respect slider.
5. **Refresh chat sidebar after user added opinion** .
6. **Chat request tooltips (1st, 2nd,)** — tutorial-style tooltips (i18n enabled) on first two incoming requests. 2nd tooltip says "from now on, notifications appear in chat sidebar."
7. **Opinions as full-width headers in chat** — not chat bubbles. Show both opinions at top, separated by a divider line.
8. **Reply-to-message** — tap/click a message to reply; show quoted snippet above the reply bubble.
9. **"I see you" reaction** — long-press/hover on other's message shows menu with "I see you" and "Reply". Persisted to DB.
10. **Move login buttons to header** — remove login from MainMenu/bottom bar, add to Header component.

---

## 1. Flip Disagree Scale + Round Save Button

**Files**: `src/pages/Index.tsx`

- Currently the slider shows "Agreement" (100 - disagreement), with agree on the right. Flip so the raw `disagreement` value maps directly to slider position (0=left=agree, 100=right=disagree).
- Remove the `100 - disagreement` inversion in display/onChange.
- Swap label positions: "Agree" on left, "Disagree" on right.
- Replace the implicit auto-save with a round button: a 32px circle with a `Check` icon that calls `saveDisagreementRating()`. Button appears when slider value differs from saved value.

## 2. Kill Signup Redirect Toast

**Files**: `src/components/AuthDialog.tsx`

- In `handleSubmit`, the signup success path (line ~101) calls `toast.success(t("auth.accountCreated"))`. Check if there's a separate redirect toast elsewhere (e.g. in auth state listener in `useAuth` or `Index.tsx`). Remove it.

## 3. Remove "Click Two Opinions" Tutorial Step

**Files**: `src/hooks/useOnboardingTutorial.ts`

- Remove the `exploreOpinions` entry from `UNIFIED_STEPS` array (line 20).
- Remove the `onNodeClicked` handler and `nodeClickCount` state since they only serve this step.
- Also remove from locale files (`en.json`, `de.json`) the `unifiedTutorial.exploreOpinions.*` keys.

## 4. Round Save Button on Respect Rating

**Files**: `src/components/chat/EmbeddedChatView.tsx`

- Replace the full-width "Save & Close" button in the rating panel with a compact round (circular) button with a `Check` icon, matching the style from feature 1.
- Keep the X close button; the round save button sits next to the slider or below it.

## 5. Refresh Chat Sidebar on Login/Signup

**Files**: `src/components/ChatsSidebar.tsx`

- The chat queries use `user?.id` in their query keys (`['myOpinionForTopic', topicId, user?.id]`, `['myChats', topicId, myOpinion?.id]`). When `user` changes from null to a value, React Query should re-fetch automatically since the key changes.
- Verify this works. If not, add an explicit `queryClient.invalidateQueries` in `Index.tsx` inside a `useEffect` that watches `user?.id`.

## 6. Chat Request Tooltips (1st, 2nd, 3rd)

**Files**: New hook `src/hooks/useChatRequestTooltips.ts`, `src/components/ChatsSidebar.tsx` or `Index.tsx`

- Track in `localStorage` how many chat requests the user has received (`freemind_chat_request_count`).
- On receiving a new incoming request, increment the counter and show a tooltip:
  - 1st: "You received your first chat request! Open it to start a conversation."
  - 2nd: "Great, another request! From now on, new requests will appear as notifications in your chat sidebar."
  - 3rd: "You're popular! Check your chat sidebar for all requests."
- After 3rd, no more tooltips. Display as a small floating toast or popover near the chat sidebar trigger.

## 7. Opinions as Full-Width Headers in Chat

**Files**: `src/components/chat/EmbeddedChatView.tsx`, `src/components/chat/ChatBubble.tsx`

- Remove opinions from `displayMessages` array.
- Instead, render a header section at the top of the messages area:
  - "Their opinion" label + full-width card with their opinion text
  - Horizontal divider (`<hr>`)
  - "Your opinion" label + full-width card with your opinion text
  - Another divider before chat messages begin
- Style: subtle background, small label text, no bubble shape.

## 8. Reply-to-Message

**Database**: Add `reply_to_id` column to `chat_messages` table (nullable UUID, FK to self).

**Files**:

- `src/components/chat/EmbeddedChatView.tsx` — add `replyingTo` state. When set, show a small quoted preview above the input. Include `reply_to_id` in `sendMessage()`.
- `src/components/chat/ChatBubble.tsx` — if message has a `replyTo` content, render a small quoted block above the bubble.
- `src/hooks/useChatMessages.ts` — update query to include `reply_to_id` and pass it through.

## 9. "I See You" Reaction

**Database**: Create `chat_message_reactions` table: `id`, `message_id` (FK chat_messages), `user_id`, `reaction_type` (text, e.g. "i_see_you"), `created_at`. RLS: users can insert/select for messages in their chats.

**Files**:

- `src/components/chat/ChatBubble.tsx` — on long-press (mobile) or hover (desktop), show a small popover with two options: "I see you" (eye/heart icon) and "Reply". "I see you" inserts a reaction row. Display a small badge/icon on the bubble if it has this reaction.
- `src/components/chat/EmbeddedChatView.tsx` — pass reaction handlers and data to ChatBubble.
- New hook `src/hooks/useChatReactions.ts` — fetch and subscribe to reactions for a chat, provide `addReaction` mutation.

## 10. Move Login Buttons to Header

**Files**: `src/components/Header.tsx`, `src/pages/Index.tsx`, `src/components/MainMenu.tsx`

- Add a "Sign In" / "Sign Up" button to the Header (right side, before the burger menu icon).
- When logged in, show a small user indicator or nothing (burger menu handles logout).
- Remove any standalone login buttons from MainMenu and BottomTabBar.
- The AuthDialog is already in Index.tsx; just wire the Header button to open it.

---

## Database Migrations Needed

1. `ALTER TABLE chat_messages ADD COLUMN reply_to_id uuid REFERENCES chat_messages(id) ON DELETE SET NULL;`
2. Create `chat_message_reactions` table with RLS policies allowing authenticated users to read/write reactions on messages in their own chats.

---

## Implementation Order

1. Quick fixes first: #2 (kill toast), #3 (remove tutorial step), #10 (login to header)
2. UI adjustments: #1 (flip scale + save btn), #4 (respect save btn), #7 (opinion headers in chat)
3. Data-dependent features: #5 (sidebar refresh), #6 (request tooltips)
4. DB migrations + new features: #8 (reply), #9 ("I see you" reaction)