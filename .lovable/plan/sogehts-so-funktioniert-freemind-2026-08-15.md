# /sogehts — "So funktioniert freemind"

A new scroll-snap explainer page that feels exactly like `/`: same theme class (`landing-theme`), same panel rhythm, same display font, same coral accent, German copy, short paragraphs.

## Page structure (one snap panel each)

1. Title: "SO FUNKTIONIERT FREEMIND" + eyebrow
2. "Bei freemind beginnt alles mit einem Kreis." / "Auf diesem Kreis stehen alle Meinungen, die mitmachen."
3. **Full-bleed screenshot: Graph**
4. "Klicke eine Meinung an und bewerte, wie groß eure Meinungsverschiedenheit ist."
5. **Full-bleed screenshot: Meinungsunterschied-Skala**
6. "Je unterschiedlicher zwei Meinungen sind, desto weiter stehen sie sich im Kreis gegenüber."
7. "Du bekommst Punkte, wenn du mit Menschen chattest, die anders denken als du – und dein Gegenüber das Gespräch gut bewertet."
8. **Full-bleed screenshot: Verständnis-Skala**
9. "Ein Beispiel" + hand-written calculation
10. "Die fünf Menschen mit den meisten gesammelten Punkten erhalten am Ende ein Losungswort." / PayPal + öffentliche Bestätigung
11. CTA panel linking to `/` (registrieren) + footer with Impressum/Kontakt, identical to `/`

## Screenshot panels (full-bleed)

Each image gets its own snap panel: image scaled to fill the panel height (`max-h-[75vh]`, `object-contain`), centered, on the page background, with a thin `border-foreground` frame and a small uppercase caption underneath (e.g. "Der Kreis", "Meinungsunterschied", "Wie gut versteht dich dein Gegenüber?"). No shadows, no rounded corners — brutalist like `/`.

Screenshots are captured from the live `/test` build with Playwright at mobile width (390px frame) so they show the real UI:
- graph view with nodes
- the 5-button Meinungsunterschied scale (rating dialog)
- the Verständnis scale in the chat panel

Images are uploaded via `lovable-assets` and referenced through `.asset.json` pointers, so no large binaries land in the repo.

## Hand-written calculation

Load the handwriting font **Caveat** (Google Fonts) and expose it as a `font-hand` Tailwind family used only on this block. Rendered as a slightly rotated (~-2deg) note:

```text
Meinungsunterschied: 10
Erhaltene Chat-Bewertung: 5
------------------------------
Deine Punkte: 10 × 5 = 50
```

with the result underlined in coral (`--alert`) and the whole block offset from the paragraph text.

## Technical notes

- New file `src/pages/Sogehts.tsx`, route `/sogehts` added in `src/App.tsx` (before the `*` catch-all).
- Reuses the panel/eyebrow/display/prose class constants from `Landing.tsx`; those get extracted into `src/pages/landing-styles.ts` so both pages share one source of truth (no visual change to `/`).
- Page-level `document.title` / meta description set for SEO ("So funktioniert freemind"), single `h1`, `alt` text on every screenshot, `loading="lazy"` on images below the fold.
- Caveat added via a `<link>` in `index.html` and a `fontFamily.hand` entry in `tailwind.config.ts`.
- Footer link "So geht's" added on `/` so the page is reachable.

## Out of scope for now

The campaign email reusing this text — say the word and I'll add it as an editable template in `/admin2` next.
