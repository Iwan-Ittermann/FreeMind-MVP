---
name: August archive unfrozen
description: /aug-test is a fully writable discussion; final August ranking lives in archive_results; no bots there
type: feature
---
- The final August standing (rank, points, opinion text, author) is snapshotted in `public.archive_results` (public read only, filled once on 2026-08-30, bots excluded). Never recompute or overwrite it.
- `/aug-test` is no longer frozen: post-reopen cutoffs were removed from write policies, `submit_opinion` and `get_or_create_chat`. Old August opinions can be rated and chatted with; points keep accumulating.
- No bots in `/aug-test` (bot opinions deleted). Bots A/B/C exist only in the sandbox `/go`.
- `delete_my_opinion(_topic_id)` lets a user delete their own opinion (cascade) in open topics; surfaced as "Delete my opinion" in the header settings of /go and /aug-test.
- The playground/archive disclaimer notice shows only once per device (localStorage `tt:mode-notice-seen:<mode>`).
