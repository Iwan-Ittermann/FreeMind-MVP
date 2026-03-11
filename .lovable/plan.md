

## Plan: Zone Cleanup, Graph Background Redesign, Sidebar Fix, Animation Debug

### 1. Mobile Padding — Graph Touching Screen Edges

**`src/pages/Index.tsx`** line 100: Change `window.innerWidth - 16` to `window.innerWidth - 4` (2px each side). Line 266 already has `px-0.5` which is fine.

### 2. Zone Label Naming Cleanup (All Themes)

Rename all hardcoded German zone labels across themes and add i18n keys.

**i18n keys to add** (en.json + de.json):
```json
"zones": {
  "respectful": "Respectful",  // de: "Respektvoll"
  "moderate": "Moderate",       // de: "Moderat"
  "extreme": "Extreme",         // de: "Extrem"
  "inactive": "Inactive"        // de: "Inaktiv"
}
```

Update labels in:
- `SignalZones.tsx` (lines 113-116)
- `CityZones.tsx` (lines 132-135)
- `ArcaneZones.tsx` (lines 57-60)
- `ConcentricCircles.tsx` (no zone labels currently, skip)

Note: "Offen" (Open) becomes "Inactive" / "Inaktiv" per user's naming.

### 3. Ring Count — One Ring Per Zone Border Only

**`SignalZones.tsx`**: Remove the 5 arbitrary `ringRadii` ripple rings (lines 20-26, 87-105). Replace with exactly 4 rings — one at each zone boundary radius:
- `greenRadius` (Respectful/Moderate border)
- `yellowRadius` (Moderate/Extreme border)
- `pinkRadius` (Extreme/Inactive border)
- `outerRadius` (Inactive/outside border)

These are solid thin lines (not dashed), with a soft glow behind each.

### 4. Zone Label Positioning

- **Respectful**: Center of the graph (`cy` center)
- **Moderate**: At the `greenRadius` border (bottom of Respectful)
- **Extreme**: At the `yellowRadius` border
- **Inactive**: At the `pinkRadius` border

### 5. Graph Background Colors — Match Screenshot

The screenshot shows:
- **Dark core**: Very dark charcoal/navy center
- **Moderate zone segmented with 3 gradient rings**: Between greenRadius and yellowRadius, three concentric gradient bands (darker inner to slightly lighter outer) creating depth/layering
- **Orange glow** bleeding from the top-left beyond the dark core into the outer ring area
- **Teal/turquoise glow** bleeding from bottom-right similarly
- **Core nodes (stars) have a gold glow** — already present in `SignalNode.tsx` via `signal-glow-gold` filter
- **Glows extend into the "non-data zone"** (rings outside outerRadius)

Implementation in `SignalZones.tsx`:
- Increase warm/cool glow opacity significantly (current 0.12/0.10 are too subtle)
- Add 3 gradient sub-rings inside the moderate zone (greenRadius to yellowRadius) using progressively lighter dark fills
- Keep the atmospheric glow extending beyond outerRadius
- Add outer rings beyond outerRadius at fixed radii with the glow bleeding through

### 6. Settings Sidebar Overlap Fix

**`MainMenu.tsx`** line 75: The bottom sheet sits at `bottom: 0` which overlaps the 56px-high `BottomTabBar`. Add `pb-16` (64px padding-bottom) or set `bottom-14` to position above the tab bar. The simpler fix: add `className="... pb-16"` to the `SheetContent` to ensure the sign-out button never overlaps the tab bar.

### 7. Chat Animation — Deep Debug

The broadcast system looks correct in code. The likely remaining issue is a **channel name collision**: `useChatMessages` creates a NEW channel `topic-{topicId}-animations` to send, but `useTopicData` already has a persistent subscription on the SAME channel name. Supabase Realtime may deduplicate or conflict when two `channel()` calls use the same name.

**Fix**: In `useChatMessages.ts`, use a unique ephemeral channel name for sending: `topic-${topicId}-animations-send-${Date.now()}`. The `self: true` config on the listener in `useTopicData` is irrelevant because the sender is a DIFFERENT channel instance. Instead, the listener should just receive from any broadcaster on that topic.

Actually, re-reading the Supabase docs: broadcast channels work by channel name — if two clients subscribe to the same channel name, they receive each other's broadcasts. But when sender and receiver are in the SAME browser tab, the sender creates a new channel with the same name, sends, and immediately removes it. The receiver's existing channel should still get the event... unless the `removeChannel` call happens before delivery.

**Better fix**: Don't create/destroy ephemeral channels. Instead, keep a persistent reference to the animation channel and use it to send. Or simpler: use `self: true` on the sender channel too and wait for delivery before removing.

**Simplest fix**: Move broadcast sending to use the SAME channel that `useTopicData` already subscribes to. Export a `sendAnimationBroadcast(topicId, payload)` utility function that reuses the existing channel. Or: in `useChatMessages`, don't create a new channel — just use `supabase.channel(channelName)` which returns the existing one if it exists.

Actually, looking at Supabase JS docs: `supabase.channel('name')` creates a NEW channel instance each time. Two instances with the same name won't share state locally. The `self: true` flag only means "the channel instance that sent the message also receives it back." Since the sender and receiver are different instances, `self: true` on the receiver doesn't help.

**The real fix**: The sender should NOT create its own channel. Instead, it should send via the existing listener channel. We can do this by:
1. Having `useTopicData` return a `broadcastAnimation` function that uses the already-subscribed channel ref.
2. Pass this function down to `useChatMessages` or the chat components.

### Files to Change

| File | Change |
|------|--------|
| `src/i18n/locales/en.json` | Add `zones.*` keys |
| `src/i18n/locales/de.json` | Add `zones.*` keys |
| `src/themes/signal/SignalZones.tsx` | Full redesign: rings, colors, gradients, label positions, i18n |
| `src/themes/city/CityZones.tsx` | Update zone labels to i18n |
| `src/themes/arcane/ArcaneZones.tsx` | Update zone labels to i18n |
| `src/pages/Index.tsx` | Reduce mobile padding; pass `broadcastAnimation` to chat components |
| `src/components/MainMenu.tsx` | Add `pb-16` to prevent overlap with bottom bar |
| `src/hooks/useTopicData.ts` | Export `broadcastAnimation` function via returned ref/callback |
| `src/hooks/useChatMessages.ts` | Accept external `broadcastAnimation` callback instead of creating own channel |
| `src/components/chat/FloatingChatWindow.tsx` | Pass broadcastAnimation |
| `src/components/chat/EmbeddedChatView.tsx` | Pass broadcastAnimation |
| `src/components/chat/FloatingChat.tsx` | Pass broadcastAnimation |

