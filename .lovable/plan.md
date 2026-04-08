

# Multi-Feature Update Plan

This plan covers 7 distinct changes requested by the user.

---

## 1. Inline Auth Form (Replace Login CTA Buttons)

**Problem**: The cyan "Sign In" buttons below the graph and in the chat sidebar require an extra click to open the auth dialog.

**Solution**: Extract the auth form content from `AuthDialog` into a reusable `AuthForm` component. Then:
- **Mobile (below graph)**: Replace the `authCta` button in `Index.tsx` with the inline `AuthForm`
- **Desktop (chat sidebar only)**: In `ChatsSidebar.tsx`, replace the "Sign in to see your chats" button with the inline `AuthForm`
- Keep the `AuthDialog` wrapper for header login button and other places

**Files**: Create `src/components/AuthForm.tsx`, edit `AuthDialog.tsx` (use AuthForm inside), edit `Index.tsx` (inline AuthForm for mobile CTA), edit `ChatsSidebar.tsx` (inline AuthForm for desktop sidebar)

---

## 2. Remove 60-Second Debounce Completely

**Problem**: The `useStableLayoutData` hook resets its timer on every change, causing the graph to never update.

**Solution**: 
- Delete `src/hooks/useStableLayoutData.ts`
- In `Index.tsx`: remove the import and usage; pass `filteredOpinions` and `topicData?.ratings` directly to `calculateLayout` and `OpinionGraph`
- Remove `secondsRemaining` and the countdown pill UI
- Remove `nodeClusters` from the layout memo (clusters being removed separately)

**Files**: Delete `src/hooks/useStableLayoutData.ts`, edit `src/pages/Index.tsx`

---

## 3. Remove DBSCAN Clustering + Colored Dots

**Problem**: Nodes are spatially spread across the circle by design, so DBSCAN produces no meaningful clusters.

**Solution**:
- In `src/lib/freemind-layout.ts`: remove the DBSCAN call (~lines 486-493), remove the `dbscan` function, remove `cluster` assignment from nodes
- Delete `src/components/graph/ClusterWedges.tsx`
- Remove `ClusterWedges` import/usage from all three theme renderers (`SignalRenderer`, `CityRenderer`, `ArcaneRenderer`)
- In `OpinionsSidebar.tsx`: remove `nodeClusters` prop, remove cluster color dots from opinion items, remove `CLUSTER_COLORS` array
- In `Index.tsx`: remove `nodeClusters` from the layout memo and from `OpinionsSidebar` props

**Files**: Edit `freemind-layout.ts`, delete `ClusterWedges.tsx`, edit 3 renderers, edit `OpinionsSidebar.tsx`, edit `Index.tsx`

---

## 4. Chat Sidebar Refresh + Toast on New Requests

**Problem**: The chat sidebar doesn't refresh when new chat requests arrive. The toast tooltip system exists but may not be triggering properly.

**Solution**:
- In `ChatsSidebar.tsx`: add realtime subscription to `chat_requests` table changes to refetch `myPendingRequests` and `myChats` queries
- Also add a 4-second polling `refetchInterval` to the chats and pending requests queries as fallback
- The toast system in `useChatRequestTooltips` + `Index.tsx` already exists and detects new incoming requests. Verify it's working by ensuring `chatRequests` in `useChatRequests` has realtime subscription (it does). No additional changes needed for toasts.

**Files**: Edit `src/components/ChatsSidebar.tsx`

---

## 5. Admin Toggle to Hide AI Chatbot

**Problem**: The AI bot panel already has an enable/disable toggle, but it creates/deletes the bot opinion. The user wants a simpler visibility toggle.

**Solution**: The existing `AIBotPanel` already has an "Enable AI Bot" toggle that creates/removes the bot opinion via `upsert_bot_opinion`/`delete_bot_opinion` RPCs. This effectively hides/shows the bot. This already fulfills the requirement — no changes needed. The toggle is already in the Admin Dashboard under the "AI Bot" tab.

**No changes needed** — already implemented.

---

## 6. Generate 17 Fake Nodes for "Links oder Rechts" Topic + Admin Toggle

This is the most complex change. The topic `2b020945-69f9-4e6b-bc03-fb50004390e0` ("Was bedeutet für dich politisch links oder rechts zu sein?") currently has 1 real opinion.

**6a. Seed fake data via edge function**: Create an edge function `seed-fake-data` that:
- Takes a `topic_id` parameter
- Creates 17 fake opinion entries in `fake_nodes` table
- Creates fake opinions in the `opinions` table using synthetic user IDs (UUIDs like `00000000-0000-0000-0000-fake000000XX`)
- Creates ~20 fake chats between random pairs of those opinions
- Creates 3-4 fake messages per chat in `chat_messages`
- Creates fake `opinion_ratings` (disagreement) between ALL pairs
- Creates fake `chat_ratings` (respect/empathy) ONLY for pairs that have chats
- The opinions will cover diverse perspectives on left/right politics

**6b. Admin toggle to hide fake nodes**: Add a new `app_settings` key `hide_fake_nodes` (default: `false`). Add a toggle in the `FakeNodesPanel`. When enabled, the graph query in `useTopicData` filters out opinions whose `user_id` matches a known fake user pattern OR whose `id` is in the `fake_nodes` table.

**6c. DB migration**: Remove foreign key constraints on `opinions.user_id` if they exist (they were already removed per memory). Add fake user IDs to be exempt from auth checks — use `SECURITY DEFINER` in the edge function.

**Approach change**: Instead of an edge function (complex auth), I'll generate the seed data as a one-time migration + insert operation. The 17 opinions with diverse perspectives will be inserted directly.

**Files**: 
- Create migration for inserting fake data (opinions, chats, messages, ratings)
- Edit `FakeNodesPanel.tsx` to add hide toggle
- Edit `useTopicData.ts` to respect hide setting
- Edit `useAppSettings.ts` if needed

---

## 7. Auto-saving Disagreement Slider

**Problem**: Currently requires clicking a check mark button to save. User wants auto-save.

**Solution**: In `useOpinionRating.ts`:
- Re-add a debounced auto-save (1000ms debounce) when `localDisagreement` changes
- Remove `save`, `hasUnsavedChanges` from the return value
- In `Index.tsx`: remove the check mark save button next to the disagreement slider

**Files**: Edit `src/hooks/useOpinionRating.ts`, edit `src/pages/Index.tsx`

---

## Summary of All File Changes

| File | Action |
|------|--------|
| `src/components/AuthForm.tsx` | **Create** — extracted inline auth form |
| `src/components/AuthDialog.tsx` | Edit — use AuthForm internally |
| `src/pages/Index.tsx` | Edit — inline auth, remove debounce, remove clusters, auto-save slider |
| `src/components/ChatsSidebar.tsx` | Edit — inline auth for desktop, add realtime refresh |
| `src/hooks/useStableLayoutData.ts` | **Delete** |
| `src/components/graph/ClusterWedges.tsx` | **Delete** |
| `src/lib/freemind-layout.ts` | Edit — remove DBSCAN |
| `src/themes/signal/SignalRenderer.tsx` | Edit — remove ClusterWedges |
| `src/themes/city/CityRenderer.tsx` | Edit — remove ClusterWedges |
| `src/themes/arcane/ArcaneRenderer.tsx` | Edit — remove ClusterWedges |
| `src/components/OpinionsSidebar.tsx` | Edit — remove cluster dots |
| `src/hooks/useOpinionRating.ts` | Edit — auto-save with debounce |
| `src/components/admin/FakeNodesPanel.tsx` | Edit — add hide toggle |
| `src/hooks/useTopicData.ts` | Edit — filter hidden fake nodes |
| Migration | Seed 17 fake opinions + chats + ratings for "links oder rechts" topic |

