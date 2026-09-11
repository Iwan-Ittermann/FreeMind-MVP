# wedium x freemind — Live event 10.–14.10.2026

Draft landing page at `/wedium`, discussion at `/wedium/go`, wedium co-branding, creator section, a fresh email journey, and two small chat/poll fixes. Placeholders wherever content is still open.

## 1. Landing page outline (`/wedium`)

Reuses the structure and components of `/` — no new design system, just wedium co-branding.

1. **Top bar** — freemind logo + "x" + wedium wordmark, DE/EN switch (same behaviour as `/`).
2. **Hero** — "wedium x freemind" eyebrow, headline about the event, dates 10.–14. Oktober 2026, one primary CTA "Platz sichern" (email registration) and a secondary link to the playground.
3. **The question** — dedicated section presenting the topic: "Welche Gesetze wünschst du dir für soziale Medien?" marked as provisional, 2–3 sentences on why this question, and a note that the final wording follows.
4. **Experiment framing (evolved)** — three short claims: (a) social media rewards outrage, (b) freemind rewards understanding, (c) we measure it — before/after polarisation survey, and the August result (62 → 40, −22 points, n = 6) as proof it works. Framed as "Feldversuch #2, diesmal mit euch".
5. **How it takes place** — the "What happens" copy from `/`, adapted to five days and wedium creators.
6. **Creators** — 5 cards, circular photo, name, handle, one-line quote. Placeholder avatars + `„Zitat folgt."` until you send material.
7. **Timeline** — registration → 10.10. question opens → discussion → 14.10. final day / winners.
8. **Registration (CTA)** — same email form and flow as `/`, plus a short line on what mails they get.
9. **Footer** — legal links, wedium credit.

Copy is written for both DE and EN; anything not yet decided is a visibly marked placeholder.

## 2. wedium branding

From wedium.social: deep indigo wordmark (script "we" + rounded "dium"), and the signature gradient peach/coral → soft violet → periwinkle blue. I will:

- add wedium accent tokens (indigo + coral) and a gradient utility scoped to the `/wedium` pages only, so the main app theme is untouched;
- recreate the gradient in CSS, and use a text wordmark styled to match until you supply the real logo file (drop-in slot ready);
- keep the freemind cosmic graph as the visual centrepiece — wedium colours frame it, they do not replace it.

Ask: if you can get their press kit, the SVG logo replaces the text wordmark in one small edit.

## 3. Discussion at `/wedium/go`

- New route `/wedium/go` running the existing discussion screen in a new `wedium` mode against its own topic (own short code, created via a settings entry like the sandbox/archive ones).
- Event phases: registration until 10.10., opinions + discussion 10.–14.10., end panel afterwards.
- No bots (this is a real event, like the August original).
- Header logo links back to `/wedium`.

## 4. Polarisation survey

- Drop the "no answer / submit later" escape: both scales must be answered, so the pre-wave is a real gate right after posting the opinion.
- Pre-wave: shown once, immediately after the opinion is posted.
- Post-wave: shown on the final day (14.10.).
- Responses stay in the existing table with the wave marking, so before/after can be compared exactly like August.

## 5. Email journey (wedium registrants)

| # | Mail | When | Trigger |
|---|------|------|---------|
| 1 | Confirm your registration (double opt-in) | instantly | they submit their email |
| 2 | Welcome + what happens on 10.10. | right after confirming | confirmation |
| 3 | "So geht's" — how freemind works | 08.10. | scheduled |
| 4 | It starts today + your personal access phrase | 10.10., 00:01 | scheduled |
| 5 | Daily short mail: your day, top 5, day's winner | 10.–14.10., 21:00 | scheduled, only if there is activity |
| 6 | Nudge: your opinion is still missing | from 11.10., once | registered but no opinion |
| 7 | Nudge: rate others | conditional, max 1 nudge / 24 h | has opinion, no ratings |
| 8 | Nudge: start a conversation | conditional, max 1 nudge / 24 h | rated, never wrote |
| 9 | Final day | 14.10., 00:01 | scheduled |
| 10 | Result + thank you (incl. polarisation outcome) | 15.10. | scheduled |

Mails 1–9 already exist as machinery; texts get a wedium version. Mail 10 (result mail) is new. Every mail is editable in the admin email editor, and all keep the existing unsubscribe / preference footer.

## 6. Small fixes

- Tapping the Chats button in the bottom bar while a chat is open closes that chat and returns to the "My chats" list (today it only resets the all-chats view).

## Technical notes

- New pages `src/pages/Wedium.tsx` and route `/wedium`, `/wedium/go` mapped to `Discussion` with `mode="wedium"`; `useEventTopic`/`useEventConfig` get a `wedium_topic_short_code` plus its own open/end timestamps in `app_settings`.
- New topic row + short code created by migration; ratings, chats, notifications, points logic all unchanged.
- Landing copy lives in one `copy` object per language inside `Wedium.tsx`, mirroring `Landing.tsx`.
- New campaign keys (`wedium-welcome`, `wedium-sogehts`, `wedium-start`, `wedium-final-day`, `wedium-result`, plus wedium nudges) in the shared campaign definition, reusing the existing template component and queue.
- `TTPolarizationPoll`: remove the "no answer" option and require both values; `TTSideTabs`: clear the active chat when the Chats tab is tapped.

## Open questions (can stay placeholders for now)

- Final question wording, creator names/photos/quotes, incentive for the best bridge builders, whether wedium wants their own legal/imprint mention.
