# Six Fixes

## 1. Fake opinions shown twice on graph

**Root cause**: The seeded fake data was inserted into BOTH the `opinions` table (as real opinions with fake user IDs) AND the `fake_nodes` table. The `useTopicData` hook then combines real opinions + fake_nodes, causing duplicates.

**Fix**: In `useTopicData.ts`, stop adding `fake_nodes` as separate opinion entries. The fake_nodes table should only be used for tracking which opinions are fake (for the hide toggle). Remove lines 304-316 that create `fakeOpinions` and merge them. Instead, use the `fake_nodes` table only to identify which real opinions to hide when the toggle is on.

Also remove `generateFakeNodeRatings` function since the ratings already exist in the DB.

**Files**: `src/hooks/useTopicData.ts`

## 2. Per-topic toggle to hide fake nodes

**Current state**: Single global `hide_fake_nodes` setting in `app_settings`. `FakeNodesPanel` is hardcoded to one topic.

**Fix**: Change the setting key to be per-topic: `hide_fake_nodes_<topicId>`. Update `FakeNodesPanel` to accept a `topicId` prop and list all topics with their fake node counts. Each topic gets its own toggle. Update `useTopicData` to check the per-topic setting.

**Files**: `src/components/admin/FakeNodesPanel.tsx`, `src/hooks/useTopicData.ts`, `src/hooks/useAppSettings.ts`

## 3. Topic editing in admin dashboard

**Current state**: Only the "main topic" title can be edited via `EditTopicTitleDialog`. Other topics in the `TopicCard` component have no edit button.

**Fix**: Add a Pencil/Edit button to each `TopicCard` that opens `EditTopicTitleDialog` for that topic. Also allow editing description. Pass selected topic state through `TopicPanel`.

**Files**: `src/components/admin/TopicPanel.tsx`, `src/components/admin/EditTopicTitleDialog.tsx`

## 4. Remove inline auth below graph on desktop

**Current state**: `authCta` renders for all users (mobile + desktop) below the graph. On desktop, the chat sidebar already has an inline auth form, creating a duplicate.

**Fix**: Only show `authCta` below the graph on mobile. Wrap with `isMobile` check.

**Files**: `src/pages/Index.tsx` (line ~398)

## 6. i18n support for homepage

**Current state**: `Home.tsx` has hardcoded German strings ("Hier kannst du...", "Aktuelle Diskussionen", "Meinungen", etc.).

**Fix**: Add `home.*` keys to both `en.json` and `de.json`, then use `t()` in `Home.tsx`.

Also add a button with flag symbol to change the language.   
  
**Files**: `src/pages/Home.tsx`, `src/i18n/locales/en.json`, `src/i18n/locales/de.json`

---

## Summary


| File                                            | Action                                                                                         |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `src/hooks/useTopicData.ts`                     | Remove fake_nodes-as-opinions logic; use fake_nodes only for filtering; per-topic hide setting |
| `src/components/admin/FakeNodesPanel.tsx`       | Per-topic toggles; list all topics with fake nodes                                             |
| `src/pages/Index.tsx`                           | Show authCta only on mobile                                                                    |
| `src/components/AboutSidebar.tsx`               | Title → "About"                                                                                |
| `src/components/admin/TopicPanel.tsx`           | Add edit button to each TopicCard                                                              |
| `src/components/admin/EditTopicTitleDialog.tsx` | Support editing description too                                                                |
| `src/pages/Home.tsx`                            | Use i18n `t()` for all strings                                                                 |
| `src/i18n/locales/en.json`                      | Add `home.*` keys                                                                              |
| `src/i18n/locales/de.json`                      | Add `home.*` keys                                                                              |
