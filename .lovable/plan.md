
## Symptom

Users on `/7mm9` submit an opinion → the entire screen turns fully black. No verification dialog, no success/error toast, no "Post" spinner clearing. Confirmed via the user: page goes fully black.

## Diagnosis (high-confidence, still to be verified)

The `/7mm9` route (`EineWocheEineFrage.tsx`) renders inside:

```
<div className="fixed inset-0 bg-black flex items-center justify-center">
  <div data-tt-phone-viewport className="... bg-background ...">
    ...app UI...
  </div>
</div>
```

There is no `ErrorBoundary` anywhere in the project (`rg` confirms zero matches for `ErrorBoundary` / `getDerivedStateFromError`). In React 18, an unhandled render error unmounts the entire root — leaving only the black outer container visible. That precisely matches "fully black, no dialog, no toast" (the toast/dialog portals also unmount with the root).

So the immediate visual bug is: **any render error after submit → whole app disappears → user sees black**. Whatever the underlying error is, this needs a boundary so the app survives and we see the real error.

The submit path (`TTCenterCTA.handleSubmit`) does several things after a successful `submit_opinion` RPC that are plausible triggers for a post-submit re-render crash:

1. Writes `tt:fresh-opinion` to `sessionStorage`; `SignalNode` reads it and switches to a `motion.g` with `initial={{ x: center, y: center }}` — if `graphSize` transitions or `token.x/y` are momentarily NaN during the refetch, framer-motion can throw.
2. `onOpinionCommitted` invalidates `['tt-own-opinion', …]` and `['topic', …]`. On the next refetch, `hasOwnOpinion` flips true, `TTCenterCTA` unmounts mid-async (its `setSubmitting(false)` may fire on an unmounted component, but that alone doesn't crash React 18). More importantly, `useTopicData` re-runs the layout with a brand-new opinion that has no ratings — need to confirm the layout returns valid numbers for the freshly-inserted row.
3. `enableTopicNotifications(topicId)` runs unconditionally when `Notification.permission === 'granted'` — if this throws synchronously in some browsers/PWAs it would bubble out of the awaited `handleSubmit` and land in the `catch` (toast.error). That produces a toast, not a black screen, so it is unlikely to be the trigger, but worth guarding.

Without a boundary the real stack trace is invisible to us and to the user. Step 1 of the fix installs a boundary so we can actually see the error; step 2 hardens the two most likely triggers.

## Plan

### 1. Add a route-level `ErrorBoundary` (unblocks diagnosis, fixes the "black screen" symptom)

- New file `src/components/ErrorBoundary.tsx`: minimal class component with `getDerivedStateFromError` + `componentDidCatch` that logs `error` and `errorInfo` to `console.error` (visible in the Lovable console log stream we can read next turn) and renders a small centered fallback with a "Reload" button styled to match the TT theme, so users at least see something and can recover.
- Wrap the `/7mm9` route (and any other single-topic-mode entry) with the boundary in `App.tsx`, or wrap the outer `<div>` inside `EineWocheEineFrage.tsx` — whichever is less invasive. Preference: wrap in `App.tsx` around every route so the whole app survives future crashes too.

### 2. Harden the post-submit path in `TTCenterCTA.handleSubmit`

- Guard `sessionStorage.setItem` (already `try/catch` — OK).
- Guard `enableTopicNotifications(topicId)` and `requestBrowserNotificationPermission()` in `try/catch` so a service-worker / notification API failure can't reject the whole submit flow.
- Track `mountedRef` and skip `setSubmitting(false)` / `setState` after unmount (defensive; not the root cause but removes noisy warnings).
- Do **not** change the RPC call or the callbacks — those are working correctly per the two other components that call `submit_opinion` the same way.

### 3. Harden `SignalNode` fresh-opinion animation

- Skip the `animateFromCenter` branch when `token.x`, `token.y`, or `graphSize` are not finite numbers.
- Wrap the `sessionStorage` read in the existing `try/catch` (already there).

### 4. Verify

- After deploying the boundary + hardening, reproduce the submit with a test passphrase via a Playwright script (`bright-peace-think-18` is one of the six minted). Post a short opinion, capture:
  - Any console error the boundary now surfaces.
  - A screenshot immediately after clicking "Post".
- If the boundary catches a specific error, fix that root cause in a follow-up (likely a NaN in the layout or a framer-motion animate target). If no error is caught and submission now succeeds cleanly, the hardening in step 2 was sufficient.

### Files touched

- **New**: `src/components/ErrorBoundary.tsx`
- **Edit**: `src/App.tsx` (wrap routes)
- **Edit**: `src/components/tt/TTCenterCTA.tsx` (harden submit path)
- **Edit**: `src/themes/signal/SignalNode.tsx` (guard fresh-opinion branch)

No DB, RPC, or migration changes — the `submit_opinion` RPC itself is unchanged and confirmed working from the other submit sites.

### Out of scope

- Redesigning the submit UI or verification flow.
- Changing the layout formula.
- Adding a global boundary for `/` (Landing) — can be done in the same App.tsx wrap for free, but I'll only note it, not restructure Landing.
