# Iris rework: dark orange pupil, blue iris

The current graph reads as one big orange disc. The mockup is the opposite: a small dark orange pupil at the very centre, then a deep blue iris that brightens outward into electric blue and fades to light blue just inside the white ring.

## New radial structure (centre → edge, viewBox 1000, r values)

```text
r 0-95     dark orange pupil          #7a3208 core -> #b4581a rim, gold star on top
r 95-115   thin warm rim / falloff    orange fading into deep blue
r 115-200  deep navy blue iris        #0b1c3f -> #123566
r 200-270  electric blue              #1863c8 -> #2a8fff (most saturated band)
r 270-330  light blue fade            #6fc4ff -> #b8e4ff, opacity easing out
r 330-352  crisp white boundary ring  #f6f2ec (unchanged)
```

Implementation in `src/components/tt/TTBackground.tsx`:
- Replace the current `tt-inner` orange gradient with a single full-iris gradient (`tt-iris`) carrying all the stops above, drawn at r=348 so it sits flush inside the white ring.
- Replace `tt-core` with `tt-pupil`: a small dark-orange radial gradient at r≈100, drawn last so it stays crisp.
- Keep a soft blur only on the iris (stdDeviation ~6) so the blue bands blend; the pupil stays unblurred and readable.
- Keep the existing dark background field, grain, and white ring as they are.

Zone tints in `src/themes/signal/SignalZones.tsx`:
- Revert the warm amber tints introduced in the last pass; the iris now supplies the colour. Use very low-opacity neutral white tints for the level rings so they read on blue without recolouring the iris.

Nodes in `src/themes/signal/SignalNode.tsx`:
- Keep the black square removal. Outer-zone nodes stay the warm marker (#F0A24B) so they contrast against the blue iris; core/star and middle markers unchanged.

Header, background field, and layout stay untouched.

## Delivery

Apply the change, capture `/test` in the mobile shell, and post the screenshot so the iris can be judged before anything else is tuned.
