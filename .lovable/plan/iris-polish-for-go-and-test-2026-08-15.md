# Iris polish for /go and /test

Bring the graph stage closer to the reference mockup: a dark, faded-blue field behind the whole screen, a much starker iris (bright blue outer halo, crisp white ring, warm multi-shade orange core), no black nodes, and a larger, better-spaced discussion question.

## What changes visually

1. **Dark faded-blue field**
   The current beige-to-grey square behind the graph is replaced by a full-bleed dark faded-blue field that also sits behind the header area, so the white question text reads cleanly instead of fading into a light patch. The field runs edge to edge and top to bottom — no visible seam where the background block ends.

2. **Starker iris**
   - Outer halo: brighter, more saturated light blue, tighter falloff so it reads as a distinct luminous ring rather than a soft blur.
   - White ring: kept crisp and bright, slightly narrower, as the boundary of the discussion field.
   - Core: switched from teal to warm orange with several visible shades from deep amber-brown at the outside to a lighter glowing amber toward the center, plus a dark inner core so the gold star at the middle still pops.
   - Concentric level rings inside the core recolored to warm amber lines at low opacity (they currently read cyan/teal).

3. **Drop black nodes**
   Outer-zone nodes in the event UI no longer render as black squares. Since negative scores no longer exist, zero/low-score nodes render in the warm palette (orange square marker) with the existing inactive opacity, keeping them visible against the dark ring.

4. **Discussion question**
   More vertical and horizontal padding around the question, and a larger type size (with a small step-down on very narrow screens so long questions still fit on two lines).

## Technical notes

- `src/components/tt/TTBackground.tsx`: replace the `tt-bg` linear gradient with the dark faded-blue field; retune `tt-inner` radial gradient to the multi-stop orange core; adjust the white ring radius/opacity and the blur radius on the halo; add a dedicated blue halo ring circle between white ring and core.
- `src/pages/Discussion.tsx` / phone shell: ensure the dark field covers the full `100dvh` shell (background color of the shell and the header gradient overlay follow the same blue), so no light band remains behind the title or below the graph.
- `src/themes/signal/SignalZones.tsx`: recolor the discrete level rings and zone tint gradients from cyan/emerald/teal to the warm amber scale for TT mode; keep radii and geometry untouched (layout stays deterministic).
- `src/themes/signal/SignalNode.tsx`: remove `OuterShapeBlack` from `ZONE_SHAPE_TT` (use the orange outer marker); leave the red user node and gold top-5 stars as they are.
- `src/components/tt/TTHeader.tsx`: title padding + responsive font size.
- No layout math, scoring, or data logic is touched.

## Preview

After implementing, I'll capture a screenshot of `/test` in the mobile shell so you can compare it against the mockup before anything else changes.
