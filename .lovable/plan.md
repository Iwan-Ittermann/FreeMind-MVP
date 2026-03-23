

## Plan: Color Scheme Overhaul

### New Graph Colors → Extended to Page

| Element | Old Color | New Color |
|---------|-----------|-----------|
| Moderate nodes | `#8FBC5E` (green) | `#14B866` |
| Respectful nodes | `#DAA520` (gold) | `#00e5ff` (cyan) |
| CTA button | `bg-accent` (honey yellow) | `#064e3b` (dark emerald) |
| Zone labels | Gold/green/orange | White for all three |
| Level ring colors | Gold/green/orange | Updated to match new node colors |

### Derived Page Theme (from graph colors)

The new palette is cyan (`#00e5ff`) + green (`#14B866`) + dark emerald (`#064e3b`). Update CSS variables to align:

- **`--primary`**: `#064e3b` → HSL `160 90% 17%` (dark emerald — CTAs, buttons, ring)
- **`--primary-foreground`**: White
- **`--accent`**: `#00e5ff` → HSL `187 100% 50%` (cyan — highlights, active states)
- **`--accent-foreground`**: Black
- **`--success`**: `#14B866` → HSL `153 80% 40%` (moderate green)

### Files to Change

| File | Change |
|------|--------|
| `src/index.css` | Update `--primary`, `--accent`, `--success`, `--ring`, sidebar vars, extended palette to new colors |
| `src/themes/signal/SignalNode.tsx` | `CoreShape`: change `#DAA520` → `#00e5ff`, glow filter to cyan. `MiddleShape`: `#8FBC5E` → `#14B866` |
| `src/themes/signal/SignalZones.tsx` | Zone labels: all `fill="white"`. Level ring colors: respectful → `rgba(0,229,255,0.18)`, moderate → `rgba(20,184,102,0.14)`, extreme stays orange-ish. Zone tint gradients updated. |
| `src/pages/Index.tsx` | CTA send button: `bg-[#064e3b]` instead of `bg-accent`. Slider accent classes updated. |
| `src/components/BottomTabBar.tsx` | Active glow uses new accent color (automatic via CSS var) |
| `src/components/DesktopBottomBar.tsx` | Same — inherits from CSS vars |

