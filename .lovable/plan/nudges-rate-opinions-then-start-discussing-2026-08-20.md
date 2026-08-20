# Nudges: rate opinions, then start discussing

Two gentle nudges that move users along the funnel: opinion → ratings → chat messages. Each nudge exists twice: as a short email and as a small in-app hint.

## The two stages

1. **Rate nudge** — user has submitted an opinion but has rated zero other opinions.
2. **Chat nudge** — user has rated at least one opinion but has not sent a single chat message.

A user only ever receives the nudge for their current stage. As soon as they act, the nudge disappears (in-app immediately, email never resent).

## In-app hint

A slim, dismissible hint bar sits just above the bottom panel on the discussion screen (/go and /test), only when the user is logged in, has an opinion, and the screen is not gated.

- Rate stage: "Bewerte 3 Meinungen." + button "Meinungen ansehen" → opens the opinions list.
- Chat stage: "Jetzt diskutieren: Schreib eine Nachricht." + button "Diskutieren" → opens the chat list.

Both texts are localized (DE/EN). Dismissing hides it for the session; it does not reappear once the user completes the step.

## Email

Two new short mails, both editable in /admin2 like the existing campaign mails, with send counts and open tracking:

- **Nudge: Bewerten** — Subject "Deine Meinung steht — jetzt bewerten". Body: one line of context, one line what to do, one button to /go.
- **Nudge: Diskutieren** — Subject "Du hast bewertet — jetzt diskutieren". Body: one line, one button to /go.

Sending rules:
- Only confirmed signups that are actually in the stage at send time.
- One nudge mail per user per stage, ever (tracked like campaigns), and never more than one nudge mail per user per day.
- Only sent while the discussion phase is open.
- Suppressed and banned addresses excluded (existing logic).
- Runs automatically on a schedule; /admin2 also gets manual "Jetzt senden" buttons for each nudge, plus a resend option per user row.

## Technical notes

- Extend `_shared/campaigns.ts` with two audience-filtered campaign keys (`nudge-rate`, `nudge-chat`) — no `dueAt`, but flagged as recurring.
- In `send-campaign-emails`, add an audience resolver for those keys: join `signups.auth_user_id` → `opinions` (own opinion in the event topic), count rows in `opinion_ratings` for that opinion, and count `chat_messages` where `sender_id` is the user. Reuse the existing recipient blocking/`campaign_sends` dedupe, plus a per-user 24h nudge throttle read from `campaign_sends`.
- Two new templates in `_shared/transactional-email-templates/campaign.tsx` style, registered in `registry.ts`; add them to the Admin2 template metadata list so they are editable/collapsible with stats.
- Schedule the nudge run through the existing campaign cron invocation (same function, extra keys) — no new cron infrastructure.
- Deploy `send-campaign-emails` and `send-transactional-email` after the template/registry change.
- New hook `useNudgeStage(topicId, ownOpinionId)`: counts the user's own `opinion_ratings` rows and own `chat_messages` rows, returns `'rate' | 'chat' | null`. Verify current RLS lets a user read their own rating and message rows; if not, add a small definer RPC returning just the two counts.
- New component `src/components/tt/TTNudgeHint.tsx`, rendered in `src/pages/Discussion.tsx`, wired to `sideTabsRef` to open the opinions/chat panels. New i18n keys under `tt.nudge*` in `de.json` and `en.json`.
