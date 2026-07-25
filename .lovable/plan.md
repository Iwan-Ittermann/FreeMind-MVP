## 1. Pill flicker (register CTA appears/disappears)

**Suspected cause.** The pill and the CTA share the same gating expression in `EineWocheEineFrage.tsx`:

```
ownOpinionKnown && !hasOwnOpinion && activeTopicId && !verifiedLoading
```

`verifiedLoading` comes from `useIsVerified`, which mounts its **own** `useAuth` instance. `useAuth` re-initializes `loading: true` on every mount, and its state is not shared. Anytime a parent re-render causes `useIsVerified` to briefly unmount/remount (e.g. via memo boundary changes) or its internal `useQuery` refetches on focus/reconnect while `authLoading` momentarily flips, `verifiedLoading` toggles `true → false`, unmounting the pill. The old CTA had the same symptom for the same class of reason.

**Fix.**
- In `useIsVerified.ts`, gate `isLoading` so it doesn't depend on transient auth re-mounts: once we know the user is unauthenticated, return `isLoading: false` immediately. Also set `placeholderData: (prev) => prev` and `refetchOnWindowFocus: false` so the query never re-enters a loading state.
- In `EineWocheEineFrage.tsx`, drop `!verifiedLoading` from the gate and instead always render **something** in that slot: verified users get `TTCenterCTA`; everyone else (including "still resolving") gets the register pill. That way the slot never blinks empty during transitions.
- Wrap the pill/CTA slot in a stable positioned container so mount/unmount of the inner variant doesn't shift layout.

## 2. Sidebars overflow the phone frame on wide screens

`TTSideTabs.tsx` panels use `w-[86vw] max-w-[360px]` — `vw` is the **browser** viewport, not the 480 px phone frame, so on desktop the panel is 86% of the window and spills out the sides of the phone.

**Fix.** Make the panels sized against the phone frame:
- Change panel width to `w-[calc(100%-2rem)] max-w-[360px]` (and same for the register pill's `max-w-[80vw]` → `max-w-[calc(100%-2rem)]`).
- Same for the backdrop — it already uses `absolute inset-0`, so it's already scoped to the phone frame; verify no `fixed` positioning escapes.
- Bottom offset stays `bottom-[84px]`; ensure `max-height` uses `min(60vh, 520px)` so tall desktop windows don't push it under the header.

## 3. Extreme-zone nodes render off-screen

Extreme radii in `tt-layout.ts` are `whiteR + 4 + k·EXTREME_STEP`. The phone frame is `min(85%, 480px)` wide and `whiteR = 0.6 · viewportW`, so `whiteR` already sits at 60% of the frame; adding padding pushes level −2/−3 nodes past the visible square and past the phone-frame clip.

**Fix — clamp with radial jitter, no clogging.**
- Introduce a `maxRenderRadius` = `min(whiteR + 4 + 2·EXTREME_STEP, config.outerRadius − nodeMargin)` where `nodeMargin ≈ 22 px` accounts for the visual node size.
- For any node whose computed extreme radius would exceed `maxRenderRadius`, place it on a thin **band** just inside `maxRenderRadius`:
  - Band width ≈ 10–14 px; assign each clamped node a deterministic sub-radius within the band based on `hash(id) mod bandSteps` so multiple clamped nodes don't stack at the same radius.
  - Keep the existing angle from `calculateDeterministicAngles` — angular collision resolution already runs afterwards in `resolveCollisions`, so angular spread handles clogging.
- Bump `resolveCollisions` iterations from 20 to ~40 only when the extreme band is populated, so tightly packed extreme nodes still separate angularly.
- Keep everything deterministic: sort by id before hashing; no randomness.

The extreme zone visually stays "outer/dangerous", but it wraps as a ring inside the visible square rather than escaping it. Angular density does increase — with ~12 extreme nodes on a 360° ring at r≈`maxRenderRadius`, the arc between neighbours is still >30°, well above the collision minimum, so clogging is not expected.

## Files to change (build phase)

- `src/hooks/useIsVerified.ts` — stabilize loading + query options.
- `src/pages/EineWocheEineFrage.tsx` — always-render slot; drop `!verifiedLoading` gate.
- `src/components/tt/TTSideTabs.tsx` — panel widths use frame-relative units; same for the register pill container.
- `src/lib/tt-layout.ts` — clamp extreme radii into a visible band with deterministic jitter; slightly more collision iterations when the band is used.

## Technical details

- `useIsVerified` change: `isLoading: !!uid && authLoading ? true : (!!uid && query.isPending)`. Plus `refetchOnWindowFocus: false`, `refetchOnReconnect: false`, `placeholderData: (p) => p ?? false`.
- Deterministic sub-radius jitter: `const h = [...id].reduce((a,c)=>((a<<5)-a+c.charCodeAt(0))|0, 0); const step = Math.abs(h) % 4; r = maxRenderRadius - step * 3;` (4 sub-lanes, 3 px apart).
- Sidebar width formula assumes the phone frame is the nearest positioned ancestor — it already is (`relative` container in `EineWocheEineFrage.tsx`).
