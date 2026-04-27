Plan to implement both requested changes safely

1. Add URL links to topic headlines
- Keep the topic title stored as normal text, but support Markdown-style links inside it:
  - Example: `Should we regulate [AI](https://example.com/report)?`
- Reuse the existing linked-title rendering already present in `TTHeader`, but harden it so only valid `http://` and `https://` links become clickable.
- Add the same linked-title renderer anywhere topic headlines are shown outside the TT feed, so raw Markdown does not leak into the UI.
- Add a short helper text in the admin create/edit topic dialogs explaining the syntax.
- Increase the topic title validation limit if needed so a headline plus link URL is not blocked by the current 200-character limit.

2. Safely swap `/` and `/tt`
- Make `/` render the TT feed.
- Make `/tt` render the current discovery/home page.
- Keep `/tt/:topicId` working temporarily as a backwards-compatible redirect to the new root topic route, so existing links do not break immediately.
- Add a new root-level topic route for the TT feed, e.g. `/:topicId`, while protecting reserved paths such as `/admin`, `/legal`, `/about`, `/eching`, `/test-diskussion`, `/t/:slug`, etc. by keeping those routes declared before the catch-all topic route.
- Update TT internal navigation when swiping topics from `/tt/${id}` to `/${id}`.
- Update header/home/back links so “home” points to the TT feed at `/`, while the old discovery page is reachable at `/tt`.

3. Update affected links and admin actions
- Change topic cards and recent opinion links on the discovery page from `/topic/:id` to the new TT topic URL `/:id` where appropriate.
- Update the admin topic preview/open button to open the new TT topic URL instead of `/topic/:id`.
- Decide whether the old full graph route `/topic/:topicId` should remain as a legacy/deep technical view. My safe recommendation is to keep it for now rather than remove it, because several older components and flows still reference it.

4. Avoid route collisions
- Ensure exact static routes are listed before the dynamic root topic route.
- Add explicit redirects for old paths:
  - `/home` -> `/tt` if it is intended to mean the discovery page.
  - `/auth` and `/chat` can continue to route to `/` unless you prefer them to route to `/tt`.
  - `/tt/:topicId` -> `/:topicId`.
- Keep `/t/:slug` unchanged for invite/join links.

5. Technical files likely changed
- `src/App.tsx`: route swap and redirects.
- `src/pages/TT.tsx`: navigation path updates for swiping topics.
- `src/pages/Home.tsx`: update topic links and linked-title display.
- `src/components/tt/TTHeader.tsx`: extract or replace title parsing with a safer shared renderer.
- `src/components/admin/CreateTopicDialog.tsx`: helper text and title length handling.
- `src/components/admin/EditTopicTitleDialog.tsx`: helper text and title length handling.
- `src/components/admin/TopicPanel.tsx`: linked-title display and admin open URL.
- Possibly `src/pages/TopicJoin.tsx`, `src/components/Header.tsx`, `src/pages/About.tsx`, `src/pages/Legal.tsx`, `src/pages/NotFound.tsx`, and `src/components/ConfigPanel.tsx` for adjusted “home” links.

6. Validation after implementation
- Run a production build/type check to catch route and typing regressions.
- Verify these paths conceptually after build:
  - `/` shows TT feed.
  - `/<topic-id>` shows TT feed focused on that topic.
  - `/tt` shows the old discovery/home page.
  - `/tt/<topic-id>` redirects to `/<topic-id>`.
  - `/admin`, `/legal`, `/about`, `/eching`, `/test-diskussion`, and `/t/<slug>` still resolve correctly.
- Verify a topic headline with `[label](https://...)` renders as a clickable external link in the TT header and as readable linked text in admin/discovery views.