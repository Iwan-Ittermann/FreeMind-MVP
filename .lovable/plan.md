There is a good reason the topic IDs are currently long: they are UUIDs, which are the database-safe internal identifiers. They avoid collisions, are supported by the existing database functions, and are already used by related records like opinions, chats, ratings, chat requests, memberships, reports, etc.

I do not recommend changing the internal `topics.id` from UUID to a 4-character code. A 4-character code like `83fh` has a much higher collision risk and would require rewriting many existing UUID-based columns/functions.

Safer implementation: keep UUIDs internally, but add short public topic codes for URLs.

Plan

1. Add short public topic codes
- Add a `short_code` column to topics.
- Format: exactly 4 characters, made from two numbers and two lowercase letters, e.g. `83fh`, `4g8l`.
- Enforce uniqueness at the database level.
- Backfill existing topics with generated codes.
- Update topic creation so every new topic gets a short code automatically.

2. Change public TT URLs to use the short code
- Current public route after the previous change: `/<uuid>`.
- New public route: `/<short_code>`, for example `/83fh`.
- Keep `/` as the TT feed.
- Keep `/tt` as the discovery/home page.
- Keep old UUID URLs working temporarily by resolving UUIDs too, so existing links do not break.

3. Resolve short codes safely in the app
- Update the TT page so route params can be either:
  - a short code like `83fh`, resolved to the internal UUID, or
  - a UUID legacy link, used directly.
- Internally, all hooks and database queries continue using the real UUID after resolution.

4. Update admin and discovery links
- Admin topic cards will show/copy/open the short URL, e.g. `https://.../83fh`.
- Discovery topic cards and recent opinion links will navigate to `/<short_code>` instead of UUID URLs.
- Invite links `/t/:slug` can remain unchanged unless you also want those shortened later.

5. Update backend topic creation
- Update the topic creation logic so new topics get:
  - internal UUID `id` for database relations
  - public `short_code` for clean URLs
  - existing `url_slug` can remain for legacy invite links

6. Validation
- Build the app to catch type/route errors.
- Verify:
  - `/` opens TT feed.
  - `/83fh` opens that topic in TT.
  - old `/<uuid>` still works.
  - `/tt` still opens discovery/home.
  - `/admin`, `/legal`, `/about`, `/eching`, `/test-diskussion`, and `/t/:slug` still work.
  - Newly created admin topics receive a short URL automatically.