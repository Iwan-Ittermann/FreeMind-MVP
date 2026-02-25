
## Goal
Resolve the persistent AI bot save failure and ensure bot chats also work after enabling.

## What I found (root cause)
I checked the live backend schema and confirmed:

1. `public.opinions` still has this FK:
   - `opinions_user_id_fkey` → `auth.users(id)`

2. The previous migration dropped the wrong constraint name:
   - It tries to drop `opinion_user_id_fkey` (singular `opinion`)
   - Actual constraint is `opinions_user_id_fkey` (plural `opinions`)
   - So nothing was actually removed.

3. There is a second blocker waiting right after this:
   - `public.chat_messages` has `chat_messages_sender_id_fkey` → `auth.users(id)`
   - Even after fixing opinion insert, bot replies would fail when inserting messages as `BOT_USER_ID`.

So the current error is real and expected with current schema.

---

## Implementation plan

### 1) Create a corrective backend migration (idempotent)
Add a new migration that safely removes both FK constraints needed for non-auth bot identity:

- On `public.opinions`:
  - Drop `opinions_user_id_fkey`
  - Also drop `opinion_user_id_fkey` defensively (in case of env naming drift)

- On `public.chat_messages`:
  - Drop `chat_messages_sender_id_fkey`

This will allow:
- Admin save to create/update bot opinion row
- AI function to insert bot chat responses

### 2) Keep existing access controls as-is
No RLS broadening needed for this fix:
- `upsert_bot_opinion` already requires admin role
- `insert_bot_message` already runs as security-definer function
- Message read/visibility policies remain unchanged

### 3) Small reliability improvement in admin settings save path
In `AIBotPanel`, replace the current update-then-insert logic with a single upsert for `app_settings` (`on conflict key`).
Reason: current update path can silently “succeed with 0 rows” and never insert; upsert is safer and simpler.

### 4) Verification steps (post-fix)
Run these checks in order:

1. Schema check:
   - Confirm both FK constraints are gone from `opinions` and `chat_messages`.

2. Admin flow:
   - Open Admin → AI Bot
   - Enable bot + save
   - Confirm no FK error toast.

3. Data check:
   - Confirm one opinion exists with `user_id = BOT_USER_ID`.

4. Runtime chat check:
   - Request chat with bot (auto-accepted)
   - Send message
   - Confirm AI reply inserts successfully (no sender FK error).

5. UI check:
   - Bot remains visible and chat continues to work 1-to-1.

---

## Files / backend objects involved

### New migration
- `supabase/migrations/<new_timestamp>_fix_bot_fk_constraints.sql`
  - Drops:
    - `public.opinions.opinions_user_id_fkey` (and defensive singular variant)
    - `public.chat_messages.chat_messages_sender_id_fkey`

### Frontend reliability tweak
- `src/components/admin/AIBotPanel.tsx`
  - Replace custom update/insert helper with true upsert for `app_settings`.

---

## Technical details
```sql
-- idempotent corrective migration
ALTER TABLE public.opinions DROP CONSTRAINT IF EXISTS opinions_user_id_fkey;
ALTER TABLE public.opinions DROP CONSTRAINT IF EXISTS opinion_user_id_fkey; -- defensive
ALTER TABLE public.chat_messages DROP CONSTRAINT IF EXISTS chat_messages_sender_id_fkey;
```

And for settings writes in admin panel, use:
- `.from('app_settings').upsert({ key, value }, { onConflict: 'key' })`

This prevents “no row updated” edge cases from silently skipping inserts.

---

## Why this is the minimal safe fix
- Fixes the exact failing constraint name mismatch.
- Prevents the next guaranteed failure in bot messaging.
- Preserves current authorization boundaries.
- Avoids larger refactors and keeps your existing bot architecture intact.
