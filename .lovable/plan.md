## Goal

Copy the full database contents of Helsinki MVP (`jmkbkwhi…`) into FreeMind MVP copy (`fednauja…`), then continue with the previously-planned **Phase 3 — drop the single-topic env-flag concept** in this Helsinki project.

## Confirmed

The two projects use different Supabase instances (`jmkbkwhiucnksdygbomc` vs `fednaujatikmzpgunhuq`) → fully isolated data. Nothing is shared today.

## Constraint you should know about

From this project's agent session, cross-project tools are **read-only**. I can query Helsinki's DB and read FreeMind MVP copy's files, but I cannot run migrations, inserts, or deploys against FreeMind MVP copy. So the port is two-sided:

1. I produce a complete export here.
2. You paste it into the FreeMind MVP copy chat and the agent there applies it.

## Approach

### Step A — Prepare the export (in this Helsinki project)

I'll produce two artifacts under `/mnt/documents/helsinki-export/`:

1. `**schema.sql**` — one consolidated migration reproducing the current Helsinki DB:
  - Enum `app_role`
  - Tables (each with GRANTs + RLS + policies): `topics`, `user_roles`, `verified_participants`, `signups`, `opinions`, `opinion_ips`, `chats`, `chat_messages`, `chat_message_reactions`, `chat_ratings`, `chat_requests`, `opinion_ratings`, `user_blocks`, `user_topics`, `fake_nodes`, `reports`, `court_cases`, `audit_logs`, `laws`, `app_settings`, `tutorial_settings`, `email_send_log`, `email_send_state`, `email_unsubscribe_tokens`, `suppressed_emails`, `test_diskussion_replies`
  - All SECURITY DEFINER functions listed in project context
  - Triggers (`auto_accept_bot_requests`, `sync_fake_node_opinion`, `update_updated_at_column`)
  - Storage buckets `tutorials` (public), `voice-messages` (private) with their policies
  - Email infra (pgmq queues + wake trigger + dispatch cron) — optional; skipped unless you want emails on FreeMind MVP copy too
2. `**data.sql**` — plain `INSERT`s produced by querying every table in Helsinki with `supabase--read_query` and formatting the rows into inserts. Rows are ordered by FK dependency so they apply cleanly (topics → opinions → chats → chat_messages → …). Uses `ON CONFLICT (id) DO NOTHING` for safety.

Note on `auth.users`: I cannot recreate authenticated users on the other project — auth rows and their passwords/passkeys don't come along. Practically that means:

- `verified_participants` rows (passphrase hashes) copy fine.
- `signups` rows copy fine.
- `opinions.user_id`, `chat_messages.sender_id`, etc. remain as-is; the underlying `auth.users` rows don't exist on the target, so those users can't sign back in on FreeMind MVP copy — but the data still reads/renders because RLS lookups pass through `has_role` / `is_verified_participant` on the ID, not on `auth.users` FK integrity. The bot user id (`…0000a1`) is a synthetic UUID and needs no auth row.

I'll flag any FK to `auth.users` that would need `ON DELETE`/relaxation before this can apply on the target.

3. **Storage objects** — I'll list what's in the `tutorials` and `voice-messages` buckets. If there's content, I'll write a short manual step: download the objects from Helsinki's storage UI and re-upload to the FreeMind MVP copy buckets after the schema migration creates them. (No cross-project storage copy tool exists.)

### Step B — Apply on FreeMind MVP copy (you drive)

In FreeMind MVP copy's Lovable chat, paste both files with instructions to:

1. Run `schema.sql` as a single migration.
2. Run `data.sql` via the insert tool.
3. Confirm row counts match a small checklist I'll include (e.g. "topics: 1, opinions: N, chat_messages: M …").
4. Re-add the runtime secrets that Helsinki uses and FreeMind MVP copy will need (`ADMIN_PASSWORD`, `ADMIN_NOTIFY_EMAIL`, `SITE_URL`; `LOVABLE_API_KEY` is auto-provisioned).
5. Redeploy any edge functions that read those secrets.

I'll write the paste-ready instructions into `/mnt/documents/helsinki-export/README.md`.

### Step C — Phase 3 in this project (Helsinki): drop the single-topic env-flag

Unchanged from the earlier plan. After the export files exist:

- Delete `src/lib/single-topic.ts`.
- Remove `VITE_SINGLE_TOPIC_MODE` / `VITE_SINGLE_TOPIC_SHORT_CODE` from `.env` and `.env.example`.
- Collapse the two-branch `AppRoutes` in `src/App.tsx` into one route table where `/` renders `EineWocheEineFrage` directly. Drop `Landing`, `TopicJoin`, `TestDiskussion`, `Index`, `RootTopicRoute`, `LockedTopicRoute`.
- Add `HELSINKI_TOPIC_SHORT_CODE = '7mm9'` to `src/lib/constants.ts` as the single source of truth.
- Remove `SINGLE_TOPIC_MODE` guards in `EineWocheEineFrage.tsx`, `TTScreen.tsx`, `TTHeader.tsx`, `ThemeContext.tsx`, `useTTTopics.ts` — keep the gated behavior (hidden zone labels, Nebula default, help overlay, lock to topic 7mm9) as the only behavior.
- Add a small redirect: `/7mm9` and `/:topicId` → `/`.
- Lock i18n to `de` (matches current event behavior).
- Verify: build passes (`tsgo`) and `supabase--linter` clean.

## Open questions

1. **Direction check** — confirm: Helsinki → FreeMind MVP copy (so the event data ends up on FreeMind MVP copy). Correct? YES, CORRECT
2. **Auth users**: do you want me to attempt to seed `auth.users` shells for the passphrase holders on the target (via a helper edge function on FreeMind MVP copy side), or accept that copied opinion/chat rows will be "orphaned from auth" and only the passphrase holders you re-mint there can log back in? ACCEPT THAT THEY WILL BE ORPHANED
3. **Email infra**: include the pgmq/cron/email-templates infra in `schema.sql`, or leave FreeMind MVP copy without email sending until it configures its own domain? DONT INCLUDE anything from the DOI Email verification flow in the Export
4. **Storage contents**: are there tutorial videos or voice messages in Helsinki's buckets you need moved, or can we skip that step? SKIP THIS STEP