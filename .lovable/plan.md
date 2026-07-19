## 1. German email templates

Rewrite the copy (subject, preview, headings, body, button label, footer disclaimer) to German — no logic or styling changes — in:

**Auth emails** (`supabase/functions/_shared/email-templates/`)
- `signup.tsx` — "Bestätige deine E-Mail-Adresse"
- `magic-link.tsx` — "Dein Anmeldelink"
- `recovery.tsx` — "Passwort zurücksetzen"
- `invite.tsx` — "Du wurdest eingeladen"
- `email-change.tsx` — "Bestätige deine neue E-Mail-Adresse"
- `reauthentication.tsx` — "Dein Bestätigungscode"

Also update the `EMAIL_SUBJECTS` map and log strings in `supabase/functions/auth-email-hook/index.ts` to German subjects.

**App emails** (`supabase/functions/_shared/transactional-email-templates/`)
- `signup-confirm.tsx` — Anmeldung bestätigen (user-facing double opt-in)
- `signup-admin-notify.tsx` — Admin-Benachrichtigung (kept in German too for consistency)

Deploy `auth-email-hook`, `send-transactional-email`, `preview-transactional-email` after edits.

Note: the auto-appended unsubscribe/footer text from Lovable's infrastructure isn't controlled by us — it will remain in its default language.

## 2. New color palette on `/` (Landing page)

The four tokens map to existing CSS variables in `src/index.css`:

| Token | OKLCH | Approx HSL |
| --- | --- | --- |
| `--background` | 0.965 0.018 240 | `210 40% 96%` |
| `--foreground` / `--border` / `--input` | 0.22 0.06 265 | `225 42% 18%` |
| `--alert` (CTA hover / accent) | 0.71 0.19 22 | `9 84% 66%` |
| `--accent-warm` | 0.87 0.14 85 | `38 82% 72%` |

Because these variables are global, changing them in `:root` would recolor the whole app. To scope to `/` only:

- Add a `.landing-theme` class scope in `src/index.css` that overrides `--background`, `--foreground`, `--border`, `--input`, `--alert`, `--accent-warm` (and derived `--ring`) with the new HSL values.
- In `src/pages/Landing.tsx`, apply the `landing-theme` class to the page root wrapper so tokens cascade only there.
- Audit `Landing.tsx` for any hard-coded color utilities (`text-white`, `bg-[#…]`, `text-black`) and replace with the semantic tokens so the new palette actually takes effect.

No changes to the TT interface at `/eine-woche-eine-frage` or other routes.

## Out of scope
- French/Spanish/Chinese translations
- Auto-appended Lovable footer text
- Global color scheme changes outside `/`
