I’ll redo only the Fake Nodes tab fix, with no routing, topic URL, layout, or unrelated changes.

Scope:
- Update `src/components/admin/FakeNodesPanel.tsx`
- Update `src/hooks/useFakeNodes.ts`
- No database changes
- No changes to topic IDs, routes, landing pages, TT UI, or other admin tabs

Implementation plan:

1. Show all active topics in the Fake Nodes tab
- Keep `useAllTopics(true)` in `FakeNodesPanel.tsx`.
- Filter to active topics:
  ```ts
  const activeTopics = topics.filter(t => t.status === 'Active');
  ```
- Render one `TopicFakeNodes` block for every active topic, using the real topic id and title.

2. Do not hide topics with zero fake nodes
- Remove the early return that currently hides empty topics:
  ```ts
  if (fakeNodes.length === 0 && !expanded) return null;
  ```
- This is the key bug: new topics with no fake nodes currently disappear from the Fake Nodes tab.

3. Keep each topic collapsed by default, but visible
Each topic section will show while collapsed:
- Topic title
- Fake-node count badge
- Per-topic visibility toggle
- Expand button

Button text will be:
```tsx
{expanded
  ? 'Collapse'
  : fakeNodes.length === 0
    ? 'Add fake nodes'
    : `Show ${fakeNodes.length} fake nodes`}
```

4. Preserve per-topic visibility settings
- Keep the existing topic-specific app setting key:
  ```ts
  hide_fake_nodes_${topicId}
  ```
- This keeps fake-node visibility independent per topic.

5. Preserve create/edit/delete behavior
- Keep using the existing hooks:
  - `useFakeNodes(topicId)`
  - `useCreateFakeNode()`
  - `useUpdateFakeNode()`
  - `useDeleteFakeNode()`

6. Add the missing cache invalidation requested in your notes
In `src/hooks/useFakeNodes.ts`, after create/update/delete, invalidate:
```ts
['fakeNodes', topicId]
['topic', topicId]
['opinionCount', topicId]
```

This ensures the graph/topic counts refresh correctly after fake-node changes.

Expected result:
- Newly created active topics appear immediately in the Fake Nodes admin tab even if they have zero fake nodes.
- Admins can click “Add fake nodes” on an empty topic.
- Existing fake-node creation, editing, deletion, and visibility toggles continue to work per topic.