

## Plan: Admin Node Deletion, Login Fix, Welcome Tooltips

### 1. Admin: Delete Opinion Node (with cascading cleanup)

Since the database has **no foreign keys**, deletion must be done via a new SECURITY DEFINER database function that manually cascades in the correct order.

**New DB migration** — `delete_opinion_cascade(opinion_id)`:
```sql
1. Delete chat_ratings where chat_id in chats involving the opinion
2. Delete chat_messages where chat_id in chats involving the opinion
3. Delete chats where opinion_a_id or opinion_b_id = opinion_id
4. Delete chat_requests where requester_opinion_id or target_opinion_id = opinion_id
5. Delete opinion_ratings where rater_opinion_id or target_opinion_id = opinion_id
6. Delete the opinion itself
7. Log audit
```
Only admins can call this (checked via `has_role`).

**New admin panel** — Add a "Nodes" tab in `Admin.tsx` with a `NodeManagementPanel` component that:
- Lists all real opinions (from `opinions_public` view)
- Shows opinion text, created_at
- Delete button per row that calls the RPC

**Files:**
- New migration: `delete_opinion_cascade` function
- New: `src/components/admin/NodeManagementPanel.tsx`
- Edit: `src/pages/Admin.tsx` — add "Nodes" tab

### 2. Fix Login Button — Replace remaining `navigate('/auth')` calls

The Auth page now just redirects to `/`, so clicking login navigates to `/auth` → redirects back to `/` → no dialog opens. Fix: replace all remaining `navigate('/auth')` with inline auth dialog triggers.

**Files to fix:**
- `src/pages/Admin.tsx` line 36: redirect to `/` instead of `/auth` (admin needs login, use `/` since auth dialog lives there)
- `src/pages/Chat.tsx` line 88: replace `navigate('/auth')` with `navigate('/')` (or add AuthDialog)
- `src/components/ConfigPanel.tsx` line 78: replace `navigate('/auth')` with `navigate('/')`
- `src/pages/TopicView.tsx` line 287: replace with `navigate('/')`
- `src/pages/TopicJoin.tsx` line 103: replace with `navigate('/')`

### 3. Multi-step Welcome Tooltips (3 pages)

Replace the current single-popup welcome with a **3-step tooltip walkthrough** tracked via localStorage key `freemind-welcome-step`.

**Step 1** — "Willkommen bei FreeMind" (centered overlay, like current)
**Step 2** — "Der Meinungskreis" (overlay pointing at graph area)
**Step 3** — "Die Mitte" (overlay pointing at center of graph)

Each step has Next/Skip buttons. After step 3 (or Skip), set `freemind-welcome-seen` in localStorage.

**i18n keys** (de.json):
```json
"welcome": {
  "title": "Willkommen bei FreeMind",
  "message": "Hier kannst du deine Meinung teilen und sehen, was andere denken.",
  "step2Title": "Der Meinungskreis",
  "step2Message": "Jeder Punkt ist eine Meinung.\nDer Kreis ist geordnet nach Zustimmung oder Widerspruch.\nBewerte Meinungen, um deine Position einzuordnen.",
  "step3Title": "Die Mitte",
  "step3Message": "Führe Chats und erhalte gute Respektwertungen von gegenüberliegenden Meinungen, um näher zur Mitte zu kommen.",
  "next": "Weiter",
  "skip": "Überspringen",
  "ok": "Los geht's"
}
```

**Files:**
- Edit: `src/pages/Index.tsx` — replace welcome popup with 3-step flow
- Edit: `src/i18n/locales/de.json` — add new welcome keys
- Edit: `src/i18n/locales/en.json` — add English equivalents

### Files Summary

| File | Change |
|------|--------|
| New migration | `delete_opinion_cascade` SECURITY DEFINER function |
| `src/components/admin/NodeManagementPanel.tsx` | New — list + delete opinions |
| `src/pages/Admin.tsx` | Add "Nodes" tab |
| `src/pages/Admin.tsx` | Fix `navigate('/auth')` → `navigate('/')` |
| `src/pages/Chat.tsx` | Fix `navigate('/auth')` → `navigate('/')` |
| `src/components/ConfigPanel.tsx` | Fix `navigate('/auth')` → `navigate('/')` |
| `src/pages/TopicView.tsx` | Fix `navigate('/auth')` → `navigate('/')` |
| `src/pages/TopicJoin.tsx` | Fix `navigate('/auth')` → `navigate('/')` |
| `src/pages/Index.tsx` | Replace welcome popup with 3-step walkthrough |
| `src/i18n/locales/de.json` | Add welcome step keys |
| `src/i18n/locales/en.json` | Add welcome step keys |

