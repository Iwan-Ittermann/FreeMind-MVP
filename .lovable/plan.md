## Goal

1. Export Helsinki's database contents to FreeMind MVP copy, with two exclusions:
   - **No 7mm9 topic data** (event topic stays in Helsinki only).
   - **No signup / verified-participant / email-verification data** (FreeMind MVP copy has no verification flow).
2. After the export is prepared, continue with **Phase 3 — drop the single-topic env-flag concept** in this Helsinki project.

## Verified state

- Helsinki has **14 topics** in `public.topics`. `7mm9` is one of them.
- The two projects use different Supabase instances (`jmkbkwhi…` vs `fednauja…`) → fully isolated data.
- From this project's agent session, cross-project tools are **read-only**. The port is two-sided: I produce the export here; you paste it into FreeMind MVP copy's chat and the agent there applies it.

## Step A — Prepare the export in Helsinki

Artifacts under `/mnt/documents/helsinki-export/`:

1. `**schema.sql**` — one consolidated migration reproducing Helsinki's core DB:
   - Enum `app_role`
   - Core tables (each with GRANTs + RLS + policies):
     `topics`, `opinions`, `opinion_ips`, `chats`, `chat_messages`, `chat_message_reactions`, `chat_ratings`, `chat_requests`, `opinion_ratings`, `user_blocks`, `user_topics`, `fake_nodes`, `reports`, `court_cases`, `audit_logs`, `laws`, `app_settings`, `tutorial_settings`, `test_diskussion_replies`, `user_roles`
   - All SECURITY DEFINER functions that support the above features (excluding the email-queue / DOI-verification functions).
   - Triggers: `auto_accept_bot_requests`, `sync_fake_node_opinion`, `update_updated_at_column`
   - Storage buckets `tutorials` (public) and `voice-messages` (private) with their policies.
   - **Excluded from schema export:** `signups`, `verified_participants`, and all email/DOI tables (`email_send_log`, `email_send_state`, `email_unsubscribe_tokens`, `suppressed_emails`), plus the pgmq/cron email infra.

2. `**data.sql**` — plain `INSERT`s for all rows except:
   - Any row tied to `topic_id` of `7mm9`.
   - All rows from `signups` and `verified_participants`.
   - All rows from email/DOI tables.
   Rows are ordered by FK dependency and use `ON CONFLICT (id) DO NOTHING` for safety.

3. `**README.md**` — paste-ready instructions for FreeMind MVP copy, including a row-count checklist.

## Step B — Apply on FreeMind MVP copy (you drive)

In FreeMind MVP copy's Lovable chat, paste both files with instructions to:

1. Run `schema.sql` as a single migration.
2. Run `data.sql` via the insert tool.
3. Confirm row counts match the checklist.
4. Re-add runtime secrets that Helsinki uses and FreeMind MVP copy will need (`ADMIN_PASSWORD`, `ADMIN_NOTIFY_EMAIL`, `SITE_URL`; `LOVABLE_API_KEY` is auto-provisioned).
5. Redeploy any edge functions that read those secrets.

## Step C — Phase 3 in Helsinki: drop the single-topic env-flag

- Delete `src/lib/single-topic.ts`.
- Remove `VITE_SINGLE_TOPIC_MODE` / `VITE_SINGLE_TOPIC_SHORT_CODE` from `.env` and `.env.example`.
- Collapse the two-branch `AppRoutes` in `src/App.tsx` into one route table where `/` renders `EineWocheEineFrage` directly. Drop `Landing`, `TopicJoin`, `TestDiskussion`, `Index`, `RootTopicRoute`, `LockedTopicRoute`.
- Add `HELSINKI_TOPIC_SHORT_CODE = '7mm9'` to `src/lib/constants.ts` as the single source of truth.
- Remove `SINGLE_TOPIC_MODE` guards in `EineWocheEineFrage.tsx`, `TTScreen.tsx`, `TTHeader.tsx`, `ThemeContext.tsx`, `useTTTopics.ts` — keep the gated behavior (hidden zone labels, Nebula default, help overlay, lock to topic 7mm9) as the only behavior.
- Add redirects: `/7mm9` and `/:topicId` → `/`.
- Lock i18n to `de` (matches current event behavior).
- Verify: build passes (`tsgo`) and `supabase--linter` clean.