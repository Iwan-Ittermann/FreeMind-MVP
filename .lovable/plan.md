I checked the relevant graph and chat code. The root route `/` currently renders the TT/mobile UI for all users, and TT uses `calculateTTLayout()` rather than the older desktop `calculateLayout()`. Collision prevention exists in both layout paths, but there are two issues to address:

1. The TT collision resolver is deterministic in ordering, but its push direction depends on angle comparisons. It should be made explicitly deterministic and aligned with the main layout resolver.
2. Desktop edge-click read-only chat is wired in `Index.tsx`/`FloatingChatManager`, but `FloatingChatWindow` currently ignores the read-only source opinion when calling `useChatSession()`. That means clicking an edge between B and C while user A is logged in can still resolve A as “my opinion” instead of showing B-C correctly. Also, `/` TT mode currently does not pass an edge-click handler at all, so edge click read-only chat is not available there.

Plan:

1. Make TT collision prevention deterministic
   - Update `src/lib/tt-layout.ts` collision resolver to use the same stable approach as `src/lib/freemind-layout.ts`:
     - Sort nodes by id before resolving.
     - Accumulate per-iteration angular deltas instead of mutating pair-by-pair in a way that can depend on intermediate changes.
     - Keep radii unchanged so nodes never cross semantic zone boundaries.
     - Keep pinned bot-node behavior.
   - This preserves the key requirement: same input data always produces the same graph.

2. Confirm `/` uses the collision-protected layout
   - `/` and `/:topicId` short-code routes render `TT`.
   - `TTScreen` passes `ttLandmarks` to `OpinionGraph`.
   - `OpinionGraph` therefore calls `calculateTTLayout()`.
   - After step 1, `/` will use the deterministic TT collision resolver consistently.

3. Fix desktop read-only edge chat between non-current-user nodes
   - Update `src/components/chat/FloatingChatWindow.tsx` so when `readOnly` is true it calls:
     - `useChatSession(theirOpinionId, readOnlySourceId)`
   - This makes the displayed “my/source” opinion be node B and the “their/target” opinion be node C, instead of accidentally using user A’s own opinion.
   - Keep the footer locked in read-only mode, so no messages or ratings can be submitted from this view.

4. Make read-only chat actually load existing B-C messages
   - `useChatSession()` currently does not create chats in read-only mode, which is correct, but it also does not fetch the existing chat id for B-C.
   - Add a read-only lookup in `src/hooks/useChatSession.ts` that finds an existing chat for `sourceOpinionId + theirOpinionId` in either order.
   - If no chat exists, the window should still show both opinions and simply no messages.

5. Add edge-click read-only behavior to `/` TT mode
   - Pass `onEdgeClick` from `TT.tsx` into `TTScreenInner`, then into `OpinionGraph`.
   - For desktop TT/root usage: open a floating read-only chat window via `FloatingChatManager.openReadOnlyChat(edge.source, edge.target)`.
   - For phone-sized TT usage: either open the existing right-side chat panel in read-only mode or, if that would require larger UI refactoring, ignore edge taps on mobile and keep node-tap behavior unchanged. The important reported case (desktop user A clicks B-C edge) will be covered.
   - Add the `FloatingChatManager` to `TT.tsx` for desktop/root if not already present, using the same manager already used by the legacy topic page.

6. Guard against edge click conflicts
   - Stop propagation on `SignalEdge` click so clicking an edge does not also clear node selection via the SVG background click.
   - Keep existing hover/dimming behavior unchanged.

7. Validation after implementation
   - Use browser inspection at `/` with a desktop viewport to verify:
     - graph stays within the TT phone viewport,
     - nodes do not visibly overlap for seeded topics,
     - refreshing the page keeps node positions stable,
     - clicking an edge between B and C opens the B-C chat in read-only mode, not A-B or A-C.
   - Also verify `/topic/:topicId` still works for the old desktop graph path.