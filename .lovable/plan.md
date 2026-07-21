## Problem found

The root cause is backend query logic, not the point formula.

For topic `7mm9`, the database has:
- 2 visible opinions: “Natürlich die AfD” and “Natürlich die Grünen”
- 1 actual chat between them
- 4 chat messages
- 2 chat respect ratings: empathy `17` and `38`
- 1 disagreement rating: `100`
- 0 `chat_requests` rows

Both affected backend functions currently require an accepted `chat_requests` row:
- `get_graph_pairs(...)` returns `[]`, so the graph receives no real chat rating edge and shows `0` points.
- `get_readonly_chat_messages(...)` also returns `[]`, so clicking the graph edge opens an empty read-only chat.

The chats sidebar works because it reads from the actual `chats` and `chat_messages` tables directly, so it sees the messages correctly.

## Fix plan

1. Create a database migration that updates `get_graph_pairs(topic_uuid)` to use real `chats` rows as the source of accepted graph edges.
   - Keep visible-opinion checks.
   - Keep disagreement from `opinion_ratings` as the source of truth.
   - Keep respect/empathy from `chat_ratings`.
   - No dependency on `chat_requests` for chats that already exist.

2. Update `get_readonly_chat_messages(_source_opinion_id, _target_opinion_id)` to read the existing chat directly from `chats`.
   - Return visible messages for the existing pair in either order.
   - Keep visible-opinion checks.
   - No dependency on `chat_requests`.

3. Preserve security posture.
   - Both functions stay read-only and still only expose visible opinions/messages.
   - No direct table exposure changes.
   - No IP-related changes.

4. Verify after migration.
   - `get_graph_pairs(7mm9 topic id)` should return one row for Grünen/AfD with non-zero `avg_empathy`.
   - `get_readonly_chat_messages(Grünen, AfD)` should return the 4 chat messages.
   - The graph should stop showing the empty-state hint and show non-zero points after the next refetch.

## Note

With the current scoring model, this one chat edge gives points to both connected nodes. Since there is only one connected pair, they may tie unless the scoring model is later changed to assign points per individual rater/receiver instead of per pair.