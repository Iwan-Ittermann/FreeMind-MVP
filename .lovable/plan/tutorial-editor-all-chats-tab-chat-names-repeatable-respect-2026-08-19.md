# Tutorial editor, all-chats tab, chat names, repeatable respect rating

## 1. Editable tutorial steps in /admin2

New table `tutorial_steps` (id, sort_order, text, highlight, is_active). Public read for everyone, writes only through the password-protected admin function.

In /admin2, a new "Anleitung (Tutorial)" section lets you:
- edit the text of each step
- reorder steps (sort order field)
- add a new step
- delete a step
- pick per step what gets highlighted while it shows: nothing, the opinion-difference scale, or the "Diskutieren" button

The tour on / and /test then renders these steps in order (one text per step, no separate EN/DE). If the table is empty, the two current hardcoded steps are used as fallback so the tour never breaks.

## 2. Tutorial box position

Move the tour card lower on the screen so it covers less of the circle: bottom-anchored above the panel instead of vertically centered.

## 3. Close tutorial when a list opens

Opening the chat list or the opinion list closes the tour (tour step reset to 0).

## 4. Chat list tabs: "Meine Chats" / "Alle Chats"

- Default tab "Meine Chats" = today's list, unchanged.
- "Alle Chats" lists every chat in the topic (both participants' opinions, title, last message, activity time) and opens them in read-only mode — no input field, no rating.
- Backend: a new security-definer function returns the topic's chat list (ids, opinion ids, title, last message preview, timestamps) without exposing anything beyond what the graph already shows. Messages are loaded with the existing read-only messages function.
- Works on mobile too (the embedded chat view gets a read-only mode, same as the desktop floating window already has).

## 5. More creative chat names

Rewrite the title prompt: witty, topical, 2-4 words, name-like rather than descriptive (e.g. "Klima-Poker"), no quotes, no colon-subtitle. Existing generated titles are cleared once so they get regenerated with the new style.

## 6. Chat view labels

"Their opinion" -> "Andere Meinung" / "Other opinion", "Your opinion" -> "Deine Meinung" / "Your opinion" (both languages).

## 7. Repeatable respect rating

Today one rating row per chat and rater is overwritten. New behaviour:
- The rating can be given once per "round" and then disappears.
- It reappears at growing message intervals, counting messages from both sides: first at 3 messages, then at 7, 12, 18, 25, 33 … (gap grows by one each time).
- Every rating is stored as its own row with the message count at which it was given, so the bridging points use the average of all your ratings for that chat (the graph already averages, so points update automatically).
- Between rounds the chat shows your last given rating in a compact, non-editable form plus a hint when the next rating unlocks.

## Technical notes

- Migration: new `tutorial_steps` table with GRANTs (select for anon/authenticated, all for service_role) + RLS; `chat_ratings`: drop unique (chat_id, rater_id), add `message_count int not null default 0`, unique (chat_id, rater_id, message_count); clear `chats.title`.
- `admin2-overview` edge function: `list_tutorial_steps`, `save_tutorial_step`, `delete_tutorial_step` actions; UI section in `src/pages/Admin2.tsx`.
- `src/components/tt/TTOnboardingTour.tsx` + `src/pages/Discussion.tsx`: steps from a new `useTutorialSteps` hook, dynamic step count, highlight flags derived from the step's `highlight` value, lower positioning, `onTabOpen` -> close tour.
- `src/components/tt/TTSideTabs.tsx`: chat sub-tabs, "Alle Chats" list; new hook `useAllTopicChats`; `EmbeddedChatView` gets `readOnly`.
- New DB function `get_topic_chats(_topic_id uuid)` (security definer) for the all-chats list.
- `supabase/functions/generate-chat-title/index.ts`: new prompt.
- `src/hooks/useChatSession.ts` + `EmbeddedChatView`/`FloatingChatWindow`: round logic (thresholds 3, 7, 12, 18, 25 …), insert instead of upsert.
- i18n keys in `de.json` / `en.json` for labels, tabs and rating hints.

## How to test /go (recommendation)

- Use /test as the safe twin: it is the same UI on a separate topic with no time gates, so all flows (login, mandatory opinion, rating, chat, tutorial) can be tried without touching event data.
- For /go itself, test with the event phases: temporarily set the phase timestamps in the admin event panel to open the current phase, walk through one full path, then set them back. Note the values before changing them.
- Test with two browsers (normal + private window) and two passphrases so you can see both sides of a chat, unread badges and the rating rounds.
- Use throwaway signups (your own address with +tags) so real participants stay untouched, and delete those test opinions afterwards via the admin node management.
- Check both languages and the mobile viewport (the phone frame is what everyone sees).
- Before the event: reset the /go topic once (admin reset) so it starts clean, and verify the emails' links point to the live domain.
