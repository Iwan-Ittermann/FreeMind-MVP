# freemind

**From moderating behaviour → incentivizing moderation.**

We're not short on disagreement. We're short on places where it doesn't destroy us.

freemind is a discussion space built around a single question: can people with
opposing views still understand each other? Instead of sorting people by how
loudly they argue, it sorts them by how well they listen.

---

## How it works

1. **One question at a time.** A discussion is scoped to a single, concrete
   question. Participants state one position — one opinion per topic, per person.
2. **The graph shows where you actually stand.** Every opinion becomes a node in
   a live map:
   - **Angle** encodes disagreement: the further apart two positions point, the
     wider the gap between them.
   - **Radius** encodes *understanding others × disagreement*: people who
     accurately describe views they disagree with move toward the centre.
   - **The centre is not the majority** — it is the best listeners.
3. **Dialogue is protected, not policed.** Exchanges happen one-to-one and are
   unmoderated; the transcripts are readable by anyone, so the conversation
   itself is the record. What is measured is not tone but whether you can restate
   the other side. Respect ratings and understanding ratings are separate
   signals: disagreeing hard is not treated as being rude.

The result of our pilots so far: affective distance between opposing camps stayed
flat or improved without any moderation layer, while the incentive to reply
across the gap remained the main thing to build.

## Tech stack

| Layer | Choice |
| --- | --- |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui |
| Animation | Framer Motion, custom SVG graph rendering |
| Backend | Supabase (Postgres, RLS, Edge Functions, Realtime) via Lovable Cloud |
| Email / scheduling | Transactional mail templates, managed HTTP cron schedules |
| i18n | EN / DE, strict translation-key usage |
| Testing | Vitest + Testing Library |

## Getting started

Requires Node.js and npm.

```sh
npm install
npm run dev
```

The dev server runs on `http://localhost:8080`.

```sh
npm run build     # production build
npm run lint      # eslint
```

Environment values for the backend are provided by the hosting platform; a local
checkout needs the project's Supabase URL and publishable key in the standard
Vite env variables.

## Repository status

This repository is a **public mirror** of the product code, published for
transparency and research interest.

- **No external contributions.** Pull requests, issues and forks are not
  reviewed. The code is a working prototype, not a supported library.
- **No warranty.** Features, data models and routes change without notice.
- **No license is granted.** Absent an explicit `LICENSE` file, all rights are
  reserved. Ask before reusing the code, the name or the visual identity.
- **Demo data.** The app is a prototype with intentionally public demonstration
  data. It is not a hosted service for third-party communities.

## A note on safety and legal compliance

Access is anonymous (passphrases, no accounts, no email required to read). IP
addresses are logged for moderation and legal liability under German law
(NetzDG / StGB); violating content is soft-deleted rather than erased so that
moderation decisions remain auditable.

---

Live: https://freemind.chat
