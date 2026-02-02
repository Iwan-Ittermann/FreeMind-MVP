# Memory: routing/app-navigation-structure-v6
Updated: 2026-02-02

The new Landing page is now the root (`/`), replacing the About page which moved to `/about`. The main application remains at `/home`. The marketing 'Splash' page stays at `/eching`.

Route structure:
- `/` → Landing (new dark-mode marketing page)
- `/about` → About (previous root page with detailed feature explanation)
- `/home` → Index (main application with opinion graph)
- `/chat` → Chat (floating chat interface)
- `/auth` → Auth (sign in/sign up)
- `/admin` → Admin (administration panel)
- `/legal` → Legal (impressum/datenschutz)
- `/eching` → Splash (marketing landing for ad traffic)
- `/t/:slug` → TopicJoin
- `/topic/:topicId` → TopicView
