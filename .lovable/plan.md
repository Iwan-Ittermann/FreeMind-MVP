

# Seed Fake Data for Three New Topics

## Approach

Replicate the exact pattern used for the "links oder rechts" topic: insert opinions (with fake user IDs), fake_nodes entries, accepted chat_requests, chats, chat_messages, and opinion_ratings. The existing `useTopicData` hook already handles fake nodes and the hide toggle works site-wide via `app_settings.hide_fake_nodes`.

## Data per Topic

For each of the 3 topics, insert:
- **17 opinions** with diverse perspectives (fake user IDs `fa0000000012`–`fa0000000062`, unique per topic)
- **17 fake_nodes** entries (tracking which opinions are fake)
- **~20 accepted chat_requests** between random pairs
- **~20 chats** matching those requests
- **3–4 chat_messages per chat** (~70 messages per topic)
- **~15 opinion_ratings** (disagreement between pairs that have chats)

No code changes needed — the existing hide toggle in `FakeNodesPanel` and filtering in `useTopicData` already apply site-wide to all topics.

## Topics and Opinion Themes

**"Was macht dich stolz auf Deutschland?"** — perspectives covering culture, engineering, social safety net, Grundgesetz, reunification, nature, football, music, science, Mittelstand, healthcare, education, diversity, history lessons, Vereine, volunteering, punctuality

**"Wie stellst du dir die Welt im Jahr 2050 vor?"** — AI everywhere, climate crisis, renewable energy, space travel, overpopulation, digital currency, remote work, biotech, water scarcity, political fragmentation, universal basic income, autonomous transport, virtual reality, nuclear fusion, food tech, surveillance state, degrowth

**"Was funktioniert oder funktioniert nicht an unserer Demokratie?"** — slow bureaucracy, strong constitution, lobby influence, federalism, voter apathy, free press, coalition compromise, direct democracy missing, independent judiciary, party system rigid, local democracy works, digitalization lagging, transparency lacking, civic education, minority protection, EU integration, term limits needed

## Files Changed

| File | Action |
|------|--------|
| DB inserts (3 batches) | Insert opinions, fake_nodes, chat_requests, chats, chat_messages, opinion_ratings for each topic |

No frontend code changes required — the existing infrastructure handles everything.

