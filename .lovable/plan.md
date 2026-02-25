

# AI Bot Node — Full Implementation Plan

## Overview

Add an AI-powered bot that appears as a distinct node on the opinion graph. Users can request chats with it (auto-accepted), and the bot replies using Lovable AI. Admins configure the bot's opinion text and system prompt from the dashboard.

---

## Architecture

```text
┌──────────────────────────────────────────────────────┐
│  Admin Dashboard  (new "AI Bot" tab)                 │
│  ├─ Toggle: enabled/disabled                         │
│  ├─ Textarea: bot opinion text (shown on graph)      │
│  └─ Textarea: system prompt / context for AI         │
│       → stored in app_settings table                 │
└──────────────┬───────────────────────────────────────┘
               │ writes
               ▼
┌──────────────────────────────────────────────────────┐
│  app_settings rows                                   │
│  ├─ ai_bot_enabled = "true"/"false"                  │
│  ├─ ai_bot_opinion_text = "I'm the AI bot..."        │
│  └─ ai_bot_system_prompt = "You are a conciliator…"  │
└──────────────────────────────────────────────────────┘
               │ read by
               ▼
┌──────────────────────────────────────────────────────┐
│  opinions table (one row for the bot)                │
│  user_id = BOT_USER_ID (fixed UUID)                  │
│  topic_id = primary topic                            │
│  text = ai_bot_opinion_text                          │
│  Managed via SECURITY DEFINER function               │
└──────────────────────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────┐
│  chat_requests trigger                               │
│  ON INSERT: if target opinion belongs to bot →       │
│    auto-set status = 'accepted'                      │
└──────────────────────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────┐
│  Edge Function: ai-chat                              │
│  POST { chatId, userMessage }                        │
│  1. Read system prompt from app_settings             │
│  2. Read chat history from chat_messages             │
│  3. Call Lovable AI gateway (gemini-3-flash-preview) │
│  4. Insert bot reply into chat_messages              │
│  5. Return reply                                     │
└──────────────────────────────────────────────────────┘
```

---

## Well-Known Constants

- **BOT_USER_ID**: `00000000-0000-0000-0000-0000000000a1` — a fixed UUID that doesn't correspond to any real auth user. Used as the `user_id` for the bot's opinion and `sender_id` for bot messages.
- **PRIMARY_TOPIC_ID**: `00000000-0000-0000-0000-000000000001` (existing constant).

---

## 1. Database Migration

### a) SECURITY DEFINER function: `upsert_bot_opinion`

- Admin-only (checks `has_role`)
- Upserts a row in `opinions` with `user_id = BOT_USER_ID`, `topic_id = PRIMARY_TOPIC_ID`, `text = <param>`
- If bot opinion already exists, updates its text
- Returns the opinion ID

### b) SECURITY DEFINER function: `delete_bot_opinion`

- Admin-only
- Deletes the bot's opinion row (when bot is disabled)

### c) Trigger on `chat_requests` INSERT: `auto_accept_bot_requests`

- AFTER INSERT trigger
- If the `target_opinion_id` belongs to an opinion with `user_id = BOT_USER_ID`, automatically update the request's status to `'accepted'`

### d) RLS consideration

- The bot's opinion will be visible via `opinions_public` view (visible=true)
- Bot messages need INSERT capability: add a SECURITY DEFINER function `insert_bot_message(chat_id, content)` that inserts with `sender_id = BOT_USER_ID`, bypassing the `auth.uid() = sender_id` RLS check
- Also need to allow the bot to be a chat participant: update `get_or_create_chat` to allow creation when one participant is the bot (the function is already SECURITY DEFINER, so we just need to relax the `_a_owner = _uid OR _b_owner = _uid` check when one owner is the bot)

### e) Update `chat_messages` RLS

- Add a SELECT policy so participants can read bot messages (the existing `is_chat_participant` check should work since the chat exists with the bot's opinion)
- The `visible = true AND is_chat_participant` policy should cover reading
- No UPDATE policy needed for bot messages

---

## 2. Edge Function: `ai-chat`

**File**: `supabase/functions/ai-chat/index.ts`

- CORS headers
- Receives `{ chatId }` (the user just sent a message, so we read the latest)
- Uses service role client to:
  1. Read `ai_bot_system_prompt` from `app_settings`
  2. Read all messages in the chat (ordered by created_at)
  3. Map messages to OpenAI format: bot messages → `assistant`, user messages → `user`
  4. Call Lovable AI gateway (`google/gemini-3-flash-preview`) with system prompt + history
  5. Call `insert_bot_message` RPC to insert the response
  6. Return `{ reply: string }`
- Handles 429/402 errors from gateway
- `verify_jwt = false` in config.toml (auth checked via service role internally)

---

## 3. Frontend Changes

### a) Constants file update

- Export `BOT_USER_ID` from a shared location (e.g., add to existing constants or create `src/lib/constants.ts`)

### b) `useTopicData.ts`

- No changes needed — the bot opinion is a real row in `opinions` table, so it's already fetched

### c) `useChatSession.ts`

- Detect bot chats: if `theirOpinion?.user_id === BOT_USER_ID`, set a `isBotChat` flag in the return value

### d) `useChatMessages.ts`

- After sending a message in a bot chat, call the `ai-chat` edge function
- Add `isBotChat` parameter; when true, after `sendMessage` succeeds, invoke the edge function with `{ chatId }`
- Show a typing indicator while waiting for the AI response

### e) Graph rendering

- All themes: detect bot node (`authorId === BOT_USER_ID`) and render with a distinct visual (e.g., purple/AI color, bot icon)
- `GraphNodes.tsx` (classic theme): add bot-specific fill color (purple)
- Themed renderers (Signal/City/Arcane): add bot detection to node token generation

### f) `TopicView.tsx`

- When user clicks the bot node and it's already accepted → show "Open Chat" (same as any accepted node)
- When clicking and no request exists → show "Request Chat" (same flow, but trigger auto-accepts instantly)

### g) `FloatingChat.tsx` / `FloatingChatWindow.tsx`

- If `isBotChat`: hide the rating sliders (no rating for bot chats), hide block button
- Show a small "AI" badge in the header

### h) Admin Dashboard — new "AI Bot" tab

**File**: `src/components/admin/AIBotPanel.tsx`

- Toggle switch for enabled/disabled
- Textarea for opinion text (what appears on graph node)
- Textarea for system prompt / context
- Save button that:
  1. Writes `ai_bot_enabled`, `ai_bot_opinion_text`, `ai_bot_system_prompt` to `app_settings`
  2. If enabled: calls `upsert_bot_opinion` RPC
  3. If disabled: calls `delete_bot_opinion` RPC
- Load existing values from `app_settings` on mount

### i) `Admin.tsx`

- Add 9th tab "AI Bot" with Bot icon

### j) Hook: `useAppSettings.ts`

- Already exists — may need to add helper to read/write the new `ai_bot_*` keys

---

## 4. Config Changes

**`supabase/config.toml`**: Add:
```toml
[functions.ai-chat]
verify_jwt = false
```

---

## 5. Enable Lovable AI

The `LOVABLE_API_KEY` secret needs to be provisioned (automatic via Lovable AI enablement).

---

## Files to Create/Edit

| File | Action |
|---|---|
| DB migration (SQL) | CREATE functions `upsert_bot_opinion`, `delete_bot_opinion`, `insert_bot_message`; CREATE trigger `auto_accept_bot_requests`; ALTER `get_or_create_chat` to allow bot |
| `supabase/functions/ai-chat/index.ts` | NEW — edge function for AI responses |
| `supabase/config.toml` | Add `[functions.ai-chat]` |
| `src/lib/constants.ts` | NEW — shared BOT_USER_ID constant |
| `src/components/admin/AIBotPanel.tsx` | NEW — admin config panel |
| `src/pages/Admin.tsx` | Add AI Bot tab |
| `src/hooks/useChatSession.ts` | Add `isBotChat` flag |
| `src/hooks/useChatMessages.ts` | Call edge function after user sends message in bot chat |
| `src/components/chat/FloatingChat.tsx` | Hide ratings/block for bot chats, show AI badge |
| `src/components/chat/FloatingChatWindow.tsx` | Same — hide ratings for bot chats |
| `src/components/graph/GraphNodes.tsx` | Purple color for bot node |
| `src/themes/signal/SignalRenderer.tsx` | Bot token flag |
| `src/themes/city/CityRenderer.tsx` | Bot token flag |
| `src/themes/arcane/ArcaneRenderer.tsx` | Bot token flag |
| `src/themes/signal/SignalNode.tsx` | Bot-specific visual |

