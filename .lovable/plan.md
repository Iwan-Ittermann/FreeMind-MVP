

# Integrate Uploaded SVG Assets into City Theme

## Overview
Place all uploaded SVG assets into the project and update CityNode and CityZones to render them instead of placeholder shapes. Core buildings and tent assets are coming later -- code will be marked with TODO comments for easy update.

## Asset Inventory

**Available now (10 files):**
- `texture_core.svg` (5000x3967) -- core zone texture
- `texture_middle.svg` (4724x4724) -- middle zone texture  
- `texture_fringe.svg` (4724x4724) -- outer/fringe zone texture
- `middle_zone_node_1.svg` through `middle_zone_node_5.svg` (1920x1920) -- 5 middle zone houses
- `fringe_zone_node_1.svg` (1920x1920) -- outer zone shack
- `flower.svg` (1920x1920) -- saved for later use

**Coming later:**
- 3 core zone buildings (will double up 2 of them to fill 5 slots -- marked with TODO)
- Tent/inactive node SVG

## Technical Concern: White Backgrounds
All uploaded SVGs have a white rectangle as their first `<path>` element (full canvas fill). When rendered as `<image>` in the graph SVG, this white box will obscure the zone textures behind them. 

**Solution**: Before copying, strip the first white-fill path from each node SVG. The textures can keep theirs since they'll be clipped to rings anyway.

If stripping isn't possible at copy time, an alternative is to render the node images with CSS `mix-blend-mode: multiply` which will make white areas transparent, but this may affect other colors. The cleanest approach is to edit the SVGs to remove the background path.

## Steps

### Step 1: Copy Assets to Project
Copy all files to `src/assets/city/` following the planned directory structure:
- `src/assets/city/textures/zone-core.svg`
- `src/assets/city/textures/zone-middle.svg`
- `src/assets/city/textures/zone-outer.svg`
- `src/assets/city/nodes/middle/house-1.svg` through `house-5.svg`
- `src/assets/city/nodes/outer/shack-1.svg`
- `src/assets/city/nodes/core/building-1.svg` through `building-3.svg` (placeholder: reuse middle houses until real assets arrive)
- `src/assets/city/flowers/flower.svg`

### Step 2: Update CityNode.tsx
- Import all node SVGs via Vite asset imports (`import house1 from '@/assets/city/nodes/middle/house-1.svg'`)
- Replace placeholder render functions with `<image href={...}>` elements
- Zone-to-asset mapping:
  - **Core**: Use the 3 uploaded core buildings, doubling 2 to fill 5 slots (marked with `// TODO: replace with unique core buildings when uploaded`)
  - **Middle**: 5 houses, selected by `hashToIndex(nodeId, 5)`
  - **Outer**: Single shack SVG
  - **Inactive**: Keep current tent placeholder until tent SVG arrives (marked with TODO)
- Render at uniform 48x48px (downscaled from 1920x1920 source)
- Keep all existing overlays: online glow, unread badge, incoming request pulse, current user glow

### Step 3: Update CityZones.tsx
- Import the 3 texture SVGs
- Replace solid-color fills with `<image>` elements clipped by annulus ring `<clipPath>` definitions
- Each texture image is placed at full size, centered on the graph, and clipped to its corresponding zone ring using SVG `clip-path` with `evenodd` fill rule
- Remove the center plaza marker (green dot) -- the texture itself provides visual identity

### Step 4: Verify CityRenderer Integration
- No changes expected -- CityRenderer already passes all needed props
- Confirm the new `<image>` elements render correctly within the motion groups

## Technical Details

**Files to modify:**
- `src/themes/city/CityNode.tsx` -- swap placeholders for `<image>` elements
- `src/themes/city/CityZones.tsx` -- add texture `<image>` with clip paths

**New files (asset copies):**
- `src/assets/city/textures/zone-core.svg`
- `src/assets/city/textures/zone-middle.svg`
- `src/assets/city/textures/zone-outer.svg`
- `src/assets/city/nodes/middle/house-1.svg` through `house-5.svg`
- `src/assets/city/nodes/outer/shack-1.svg`
- `src/assets/city/nodes/core/building-1.svg` through `building-3.svg`
- `src/assets/city/flowers/flower.svg`

**White background handling:**
Since we cannot programmatically strip SVG paths during copy, I will use a CSS approach: set `style={{ mixBlendMode: 'multiply' }}` on node `<image>` elements. This makes white areas transparent while preserving colored content. For textures this is not needed since they fill their entire ring.

