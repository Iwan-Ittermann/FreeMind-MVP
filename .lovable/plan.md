
## Goal

Cut Helsinki MVP loose from the shared backend (`jmkbkwhiucnksdygbomc`), point it at a fresh empty Lovable Cloud backend, re-apply the full schema, and remove the `VITE_SINGLE_TOPIC_MODE` / `VITE_SINGLE_TOPIC_SHORT_CODE` env-flag concept so the app is simply a one-topic app.

## Sequencing

This is a two-phase change. The first phase requires **you** to attach a fresh Cloud backend to this project from the Lovable UI (Connectors → Lovable Cloud → new instance). I'll wait for that and then continue with everything else in one pass.

## Phase 1 — You attach a new backend

You do this from the UI. When it's done, `.env` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`) auto-updates to the new empty instance. Nothing else is populated yet — no tables, no functions, no storage, no secrets.

Confirm to me it's attached, then I run Phase 2.

## Phase 2 — Re-apply everything to the new backend

### 2a. Schema migration (single consolidated migration)

Reproduce the current DB in one migration:

- Enums: `app_role`
- Tables (with GRANTs + RLS + policies): `topics`, `user_roles`, `verified_participants`, `signups`, `opinions`, `opinion_ips`, `chats`, `chat_messages`, `chat_message_reactions`, `chat_ratings`, `chat_requests`, `opinion_ratings`, `user_blocks`, `user_topics`, `fake_nodes`, `reports`, `court_cases`, `audit_logs`, `laws`, `app_settings`, `tutorial_settings`, `email_send_log`, `email_send_state`, `email_unsubscribe_tokens`, `suppressed_emails`, `test_diskussion_replies`
- All SECURITY DEFINER functions listed in project context (`has_role`, `is_verified_participant`, `submit_opinion`, `create_topic`, `get_graph_pairs`, `get_readonly_chat_messages`, `join_topic`, `report_content`, `review_report`, `toggle_soft_delete`, `log_audit`, `generate_topic_short_code`, email queue helpers, etc.)
- Triggers: `auto_accept_bot_requests`, `sync_fake_node_opinion`, `update_updated_at_column` on relevant tables
- Storage buckets: `tutorials` (public), `voice-messages` (private) with their policies

### 2b. Seed the single event topic

Insert one row into `topics` with `short_code = '7mm9'`, status `Active`, the German title/description currently used on the event build.

### 2c. Re-mint 6 verified test passphrases

Run a one-off admin-only edge function (same shape as before) that inserts 6 rows into `signups` + `verified_participants` and returns the plaintext passphrases once. Function is deleted immediately after.

### 2d. Secrets to re-add

I'll ask you to re-add these on the new backend via `add_secret`:
- `ADMIN_PASSWORD`
- `ADMIN_NOTIFY_EMAIL`
- `LOVABLE_API_KEY` (rotated)
- `SITE_URL`

The `SUPABASE_*` secrets are auto-provisioned. `email_queue_service_role_key` (vault) is only needed if you re-enable the email queue on the new instance — deferred unless you ask.

### 2e. Edge functions

All existing functions under `supabase/functions/*` redeploy automatically against the new project ref. I'll verify each still compiles; nothing app-level should need to change.

## Phase 3 — Drop the single-topic env-flag concept

Since this project is now permanently a one-topic app, remove the branching:

- `src/lib/single-topic.ts` — delete
- `.env` / `.env.example` — remove `VITE_SINGLE_TOPIC_MODE` and `VITE_SINGLE_TOPIC_SHORT_CODE`
- `src/App.tsx` — collapse `SINGLE_TOPIC_MODE` branch into the sole route table; remove `Landing`, `TopicJoin`, `TestDiskussion`, `Index`, `NotFound` (or keep `NotFound` for `*`). `/` → `EineWocheEineFrage`; `/legal`, `/confirm`, `/unsubscribe`, `/admin`, `/admin2` stay; drop the `/:topicId` short-code routes entirely.
- `src/i18n/config.ts` — always lock to `de` (or keep detector — decide with you; default: lock to `de` to match current event behavior)
- `src/hooks/useTTTopics.ts` — always filter to the single topic (query by `short_code = '7mm9'` via a constant, or by the singleton topic id fetched at boot)
- `src/pages/EineWocheEineFrage.tsx`, `src/components/tt/TTScreen.tsx`, `src/components/tt/TTHeader.tsx`, `src/themes/ThemeContext.tsx` — remove `SINGLE_TOPIC_MODE` guards; keep the behavior they gated (hidden zone labels, Nebula default, help overlay, etc.) as the only behavior.

Introduce one small constant `HELSINKI_TOPIC_SHORT_CODE = '7mm9'` in `src/lib/constants.ts` for the seed lookup, so the codebase still has a single source of truth without an env flag.

## Phase 4 — Verify

- Build passes (`tsgo`).
- Playwright smoke: open `/`, verify the topic loads, sign in with one minted passphrase, submit an opinion, confirm graph renders.
- `supabase--linter` clean on the new backend.

## What I need from you before Phase 2

1. Attach the new Lovable Cloud backend to this project.
2. Reply "attached" so I can start the migration.
3. Have the 4 secrets above ready to paste when I prompt.

## Technical details

- The current shared backend is left untouched — FreeMind MVP copy keeps it.
- No data is copied over. `7mm9`'s current opinions, chats, ratings, signups, and verified participants stay on the old backend and do NOT move.
- `supabase/config.toml`'s `project_id` is auto-managed by Lovable when the backend is swapped; I won't hand-edit it.
- The route `/:topicId` (short-code) goes away — since there's only one topic, it lives at `/`. Any inbound links using `/7mm9` will 404 unless we add a redirect; I'll add a small redirect from `/7mm9` and `/:topicId` → `/` to be safe.
