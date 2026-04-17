

## Root Cause

`src/pages/Home.tsx` calls translation keys with the prefix `landing.home.*` (e.g. `landing.home.hero.headline`, `landing.home.discussions`, `landing.home.opinions`), but in the locale JSON files these keys live at the top level under `home.*`. The `landing` object only contains the marketing landing page sections (`trustLine`, `hero`, `problem`, `cta`, `footer`, etc.) — there is no `landing.home` namespace.

Result: every `t('landing.home.X')` call falls through to the raw key string.

A few calls use a fallback like `t('landing.home.login', t('home.login'))` which work. The rest (hero headline, bullets, "Available Topics", "Opinions", "Chats", "More/Less", "Recent Opinions") have no fallback and render the raw key.

## Fix

Single-file change to `src/pages/Home.tsx`: replace every `t('landing.home.X')` call with `t('home.X')` so it matches the actual JSON structure.

| Old key | New key |
|---|---|
| `landing.home.nav.about` | `home.nav.about` |
| `landing.home.login` | `home.login` |
| `landing.home.loggedIn` | `home.loggedIn` |
| `landing.home.hero.headline` | `home.hero.headline` |
| `landing.home.hero.subheadline` | `home.hero.subheadline` |
| `landing.home.hero.bullet1/2/3` | `home.hero.bullet1/2/3` |
| `landing.home.discussions` | `home.discussions` |
| `landing.home.noDiscussions` | `home.noDiscussions` |
| `landing.home.opinions` | `home.opinions` |
| `landing.home.chats` | `home.chats` |
| `landing.home.showMore` / `showLess` | `home.showMore` / `home.showLess` |
| `landing.home.recentOpinions` | `home.recentOpinions` |

No JSON changes needed — all keys already exist correctly in both `en.json` and `de.json`.

## Hardening (i18n safety)

To prevent this class of bug from recurring, also enable i18next's missing-key warning in `src/i18n/config.ts`:
- Add `saveMissing: true` and a `missingKeyHandler` that logs `console.warn` for any unresolved key in development.

This makes future missing keys immediately visible in the browser console instead of silently rendering as raw labels.

## Files to change

| File | Change |
|---|---|
| `src/pages/Home.tsx` | Replace ~14 `landing.home.X` keys with `home.X` |
| `src/i18n/config.ts` | Add dev-time `missingKeyHandler` to warn on unresolved keys |

