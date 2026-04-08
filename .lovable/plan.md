

# Show Existing Topic on Homepage

## Problem

The original topic with 34 opinions has ID `00000000-0000-0000-0000-000000000001` and title "Dies ist eine Beispielfrage zu einem kontroversen Thema". Its status is **Archived**, so the homepage query (which filters `status = 'Active'`) excludes it.

Meanwhile, `0207dd07-...` ("Dies ist eine Beispielgrage zu einem polarisierten Thema") has **0 opinions** — it's a duplicate that was created later.

## Fix

1. **Database migration**: Set the original topic's status back to `Active`:
   ```sql
   UPDATE topics SET status = 'Active' WHERE id = '00000000-0000-0000-0000-000000000001';
   ```

2. **Optionally delete the empty duplicate** topic `0207dd07-250e-48a2-a805-25aeb603cf1c` (0 opinions, redundant title) to avoid confusion on the homepage. Or archive it:
   ```sql
   UPDATE topics SET status = 'Archived' WHERE id = '0207dd07-250e-48a2-a805-25aeb603cf1c';
   ```

No code changes needed — the homepage already renders all Active topics with their MiniGraphs.

## Files Changed

| File | Changes |
|------|---------|
| Migration only | Re-activate original topic, archive empty duplicate |

