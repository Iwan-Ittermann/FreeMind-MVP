# Arrow view as a switch in /go

## Clarification first

/secret is not a copy. It runs on the same live topic (the real event question) and the same database as /go: same opinions, same chats, same ratings, same points. The only difference is how chats are drawn (short arrows instead of hover edges) and that the gates (time lock, mandatory opinion) are skipped there. So anything you actually do on /secret — sending a message, rating, submitting an opinion — does affect /go. Nothing is mirrored or sandboxed.

Given that, a separate route adds no safety, only confusion. Making the arrow rendering a switch inside /go is the cleaner setup.

## What to build

1. Add an "Arrows / Chats as arrows" toggle to the settings (gear) panel in the discussion header, next to the existing toggles.
2. The choice is stored per device (localStorage) and applies immediately to the graph: on = all chats drawn as short directional arrows (length = chat length, color = your points), off = current behaviour (edges on hover/selection).
3. The toggle is available on /go and /test for everyone — nothing about the gates, data, or scoring changes.
4. Retire /secret: redirect it to /go so old links keep working, and drop the arrows-only variant plumbing.

## Technical notes

- New tiny hook (e.g. `useArrowModePref`) reading/writing a localStorage key plus a window event so header and graph stay in sync without prop drilling through the page.
- `Discussion.tsx` reads the pref instead of `variant === 'arrows'` and passes it as `arrowMode` to `TTScreenInner`; the arrow render path (`useChatArrows`, `SignalChatArrows`) is unchanged.
- Keep `freeAccess` behaviour tied to nothing — gates return to normal for all routes; remove the `variant` prop from `Discussion` and delete `src/pages/Secret.tsx`, replacing the route with a redirect to `/go`.
- New label added to both EN and DE locale files.
