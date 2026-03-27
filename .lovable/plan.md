

## Fix: Arcane Theme Transparency Grid on Nodes

### Problem
The Arcane theme uses 1024×1024 sprite sheets (3×3 grid) for node graphics. The areas between sprite cells are transparent, and the `<image>` element renders that transparency as a visible checkerboard/rectangle — this is inherent to how SVG `<image>` handles transparency over backgrounds.

Clipping alone can't fully fix this because the individual sprite cells themselves likely have transparent backgrounds (they were exported from an image editor with transparency preserved).

### Solution: Replace sprite sheets with inline SVG shapes

Instead of fighting with sprite-sheet cropping, render Arcane nodes as **styled SVG circles with zone-specific arcane colors and a subtle glow effect** — no external image assets needed.

Each zone gets a distinct visual identity:
- **Core**: Deep purple with golden glow (`hsl(270, 60%, 30%)` + gold stroke)
- **Middle**: Dark blue-purple (`hsl(240, 50%, 25%)` + teal stroke)  
- **Outer**: Dark teal (`hsl(200, 40%, 20%)` + dim stroke)
- **Inactive**: Muted gray-purple (`hsl(260, 10%, 30%)`)

Each node gets a unique inner pattern (rune-like lines) based on its ID hash for visual variety.

### File changes

**`src/themes/arcane/ArcaneNode.tsx`**
- Remove all sprite sheet imports (`core.svg`, `middle.svg`, `outer.svg`, `inactive.svg`)
- Remove `GRID`, `ZONE_SPRITES`, sprite positioning math
- Replace the `<defs>/<clipPath>/<image>` block with:
  - A filled `<circle>` with zone-colored radial gradient
  - A subtle glowing stroke
  - A decorative inner pattern (2-3 lines based on hash) for visual variety
- Keep all existing badges, speech bubbles, YOU flag, online/unread indicators unchanged

This approach:
- Eliminates all transparency artifacts permanently
- Removes 4 large SVG asset dependencies (~7000 lines each)
- Fits the "arcane/mystical" aesthetic with glowing circles
- Is simpler and more performant than sprite sheet cropping

