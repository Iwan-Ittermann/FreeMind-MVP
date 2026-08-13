# Graph Tab Restyle — Nebula Look from the Mockup

Visual-only restyle of the graph tab so it matches the uploaded mockup. No layout logic, no scoring, no features change.

## What changes visually

**Background**
- Deep violet at the top fading through midnight navy to near-black at the bottom, filling the whole mobile frame.
- The grey/tan bands currently visible above and below the circle disappear — the radial field spans the full space between title and tab bar.

**Zone rings (inside out)**
- Respectful core: warm amber/orange glow with soft inner haze, thin orange guide rings.
- Moderate: transition ring, cool cyan-blue glow instead of today's teal.
- Extreme: soft off-white halo as the outermost band, with faint hairline rings outside it.
- Zone labels stay hidden (as today).

**Nodes**
- Small speech-bubble chips with a light translucent surface and a thin border, score label directly beneath in a small bold numeral with a soft dark shadow so it reads over the bright halo.
- Top-5 nodes render as a glowing gold star (current user's node stays in the accent red).
- 0-point / inactive nodes sit on the outermost line, dimmed.
- Negative scores get a muted warm-red chip so they read as extreme without shouting.

**Title and chrome**
- Italic serif question stays flush under the header, centered, in near-white on the violet.
- Header keeps the slim treatment: logo left, help / bell / gear right, bell dot in accent red.
- Tab bar gets a dark translucent blurred surface with a hairline top border; active tab in accent with a short underline.

**Add-opinion CTA**
- Keeps its current position and three-state behaviour; restyled as a warm amber pill so it reads as the primary action against the cold outer field.

**Motion**
- Slow breathing glow on the core only. Nodes fade in. Nothing fast.

## Technical notes

- All new values go in as semantic tokens in `index.css` (background gradient, zone glow colors, halo, node surface, star gold, CTA gradient) and are referenced through Tailwind; no hardcoded color utilities in components.
- Touched files: `index.css`, `tailwind.config.ts`, `TTBackground.tsx` (gradient + ring/glow rendering), the node renderer in the graph screen, `TTHeader.tsx`, `TTScreen.tsx` title block, `TTSideTabs.tsx` tab bar, `TTCenterCTA.tsx`.
- `tt-layout.ts` is not touched: radii, determinism, tie handling, negative-point collapse to the boundary and the safe-pad clamp all stay exactly as they are.
- Contrast checked for score labels over both the bright halo and the dark core.
