---
name: Respect rating unlock & bridge point notifications
description: Respect scale unlocks after one message per side and stays open; bridge points trigger notifications, chat messages do not
type: feature
---

- Respect/understanding scale (0-100) unlocks as soon as BOTH participants sent at least 1 message and then stays open permanently. No recurring "rounds" (old 2/3/4/5-message scheme removed).
- Manipulation protection comes from `rating_events` (append-only) + time-weighted scoring, not from limiting rating frequency.
- Notifications: receiving bridging points creates a `bridge_points` notification (trigger `trg_notify_bridge_points` on `rating_events`). New chat messages (`type = 'message'`) are NEVER shown in the notification panel — unread badges in the chat list cover them.
- Bell filter key: `bridgePoints`; server pref column `push_prefs.new_bridge_points` (default true).
- Graph radius uses points/top-score ratio (`fracForTotal`), not ordinal rank.
- Logout uses `signOut({ scope: 'local' })` so sessions on other devices survive.
