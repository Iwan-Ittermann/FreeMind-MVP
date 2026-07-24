## Goal

Undo the over-collapse: `/` should show the Landing signup page (so users can register their email and receive a passphrase). The single Helsinki topic view keeps rendering, but at `/7mm9` instead of `/`.

## Changes

### 1. Restore `src/pages/Landing.tsx`
Recover the file from git (last present in commit `888818b`) exactly as it was — it already:
- Renders the marketing/signup landing.
- Posts the email to the `signup-request` edge function.
- Links to `/legal` for Impressum.

No content edits.

### 2. Rewire `src/App.tsx`
Update `AppRoutes` to:

```tsx
<Route path="/" element={<Landing />} />
<Route path="/7mm9" element={<EineWocheEineFrage />} />
<Route path="/confirm" element={<Confirm />} />
<Route path="/unsubscribe" element={<Unsubscribe />} />
<Route path="/legal" element={<Legal />} />
<Route path="/admin2" element={<Admin2 />} />
<Route path="/admin" element={<Admin />} />
<Route path="/auth" element={<Navigate to="/" replace />} />
<Route path="/:topicId" element={<Navigate to="/7mm9" replace />} />
<Route path="*" element={<Navigate to="/" replace />} />
```

Add the `Landing` import back. No other logic changes.

### 3. No other files touched
- `EineWocheEineFrage.tsx`, `useTTTopics.ts`, `ThemeContext.tsx`, `constants.ts` stay hardwired to `7mm9` — that part of Phase 3 remains correct.
- `single-topic.ts` stays deleted; env flags stay removed.
- i18n stays locked to German.

## Verification

- `/` renders the Landing signup form.
- `/7mm9` renders the topic UI (current preview keeps working).
- Any other `/:something` redirects to `/7mm9`; unknown paths redirect to `/`.
- Build passes.
