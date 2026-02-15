

# Landing Page Redesign for FreeMind.city

## Overview

Replace the current dark-mode landing page at `/` with a new light, minimal, professional landing page targeting municipalities, educational institutions, and democratic initiatives. The old landing page moves to `/old-lp`. Full bilingual support (DE + EN) via i18n.

## Design Direction

- **Light mode**: White background, dark gray text, subtle green/blue accents for the graph center
- **Typography-first**: Clean, spacious, no playful icons
- **Tone**: Reflective, precise, intellectually accessible -- no marketing buzzwords
- **Mobile-first** with responsive desktop layout
- **Subtle hover effects**, no gamification aesthetics

## Routing Changes

In `App.tsx`:
- Add a new route `/old-lp` pointing to the current `Landing` component (renamed import to `OldLanding`)
- The `/` route will point to the new `Landing` component (`src/pages/Landing.tsx` -- overwritten)

## New Landing Page Structure (`src/pages/Landing.tsx`)

### Section 1 -- Hero (split layout)

```text
[Logo: FreeMind.city]                    [Trust line top-right]

BIG HEADLINE                             [Abstract graph/city
Subheadline                               visualization -- SVG
                                          or CSS-based concentric
[Direkt starten] [Einloggen]              circles with dots]

Reassurance line
```

- **Left side**: Headline, subheadline, two buttons (fake passkey CTA links to `/auth`, "Einloggen" links to `/auth` with login mode selected via `?mode=login`), reassurance text
- **Right side**: Abstract graph visualization built with CSS/SVG (concentric circles with scattered dots representing the discourse graph -- no screenshot, purely decorative)
- Trust line top-right: small text "Anonyme Teilnahme . Innovativer Diskussions-Graph . Rechtssicher moderiert"

### Section 2 -- Das Problem

Heading + 3 cards in a row:
1. Polarisierung
2. Lautstärke statt Qualität  
3. Fehlende Struktur

Each card: icon-free, just a title and short description in a bordered box.

### Section 3 -- Unser Ansatz

Heading + 3 feature/benefit cards:
1. Strukturierter Diskursraum
2. Respekt x Gegensätzlichkeit
3. Sichtbare Qualität

### Section 4 -- Geeignet für

Heading + 4 use-case items displayed as clean text blocks (no logos):
- Kommunale Bürgerdialoge
- Kontroverse Infrastrukturprojekte
- Schul- & Hochschuldiskurse
- Jugendbeteiligung & Bürgerhaushalte

Followed by a small explanatory note.

### Section 5 -- Wie es funktioniert

3 steps with arrow connectors:
1. Meinung veröffentlichen
2. Gegensätzliche Stimme wählen
3. Austausch bewerten

### Section 6 -- Produkt + Key Benefits

Split layout:
- **Left**: Abstract product visualization (CSS concentric circles with movement indicators)
- **Right**: Bullet list with checkmarks, last item bold

### Section 7 -- FAQ

3 collapsible accordion items using the existing shadcn Accordion component.

### Section 8 -- Final CTA

Centered heading + button + reassurance text.

### Footer

FreeMind.city | Datenschutz | Impressum | Kontakt (mailto link)

## i18n

Add a new `landing` key to both `de.json` and `en.json` with all section content translated. The page will use `useTranslation()` throughout.

## Files Changed

| File | Action |
|------|--------|
| `src/pages/Landing.tsx` | **Rewrite** with new landing page |
| `src/pages/OldLanding.tsx` | **Create** -- copy of current Landing.tsx |
| `src/App.tsx` | Add `/old-lp` route |
| `src/i18n/locales/de.json` | Add `landing` section |
| `src/i18n/locales/en.json` | Add `landing` section |

## Technical Notes

- The abstract graph visualization in Hero and Section 6 will be built with pure CSS/SVG (concentric circles + scattered dots with subtle animation), not a screenshot
- Framer Motion used for scroll-triggered fade-in animations (consistent with existing codebase)
- The "Direkt starten" button links to `/auth` (signup mode)
- The "Einloggen" button links to `/auth?mode=login`
- Auth page will need a minor update to read the `mode` query param and pre-select the login tab
- FAQ uses the existing `@radix-ui/react-accordion` component
- Language switcher will be included in the header/nav area
- All content is fully bilingual

