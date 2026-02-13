/**
 * Inline SVG house shape generators — pastel isometric style.
 * All shapes are pure functions returning SVG element props.
 */

// Pastel palette for clusters
const CLUSTER_COLORS = [
  { wall: '#FFD6E0', roof: '#E8A0B4', accent: '#C97B91' },  // Pink
  { wall: '#D4E7FF', roof: '#9EC5F0', accent: '#6FA3D8' },  // Blue
  { wall: '#D5F5E3', roof: '#8FD9B0', accent: '#5EBD8C' },  // Green
  { wall: '#FFF3CD', roof: '#F0D68C', accent: '#D4B85C' },  // Yellow
  { wall: '#E8D5F5', roof: '#C9A5E3', accent: '#A578C7' },  // Purple
  { wall: '#FFE5CC', roof: '#F0C898', accent: '#D4A56A' },  // Orange
  { wall: '#CCF2F4', roof: '#88D8E0', accent: '#5ABEC7' },  // Teal
  { wall: '#F5D5D5', roof: '#E0A8A8', accent: '#C77B7B' },  // Salmon
];

export function getClusterColor(clusterId: number | null) {
  const idx = clusterId != null ? Math.abs(clusterId) % CLUSTER_COLORS.length : 0;
  return CLUSTER_COLORS[idx];
}

/**
 * Public building for core zone — wider, taller, with a flag
 */
export function renderPublicBuilding(
  size: number,
  colors: ReturnType<typeof getClusterColor>,
  highlight: boolean,
) {
  const w = size * 2.2;
  const h = size * 2.8;
  const roofH = h * 0.3;
  return {
    width: w,
    height: h,
    elements: [
      // Shadow
      { type: 'ellipse' as const, cx: 0, cy: h * 0.48, rx: w * 0.5, ry: h * 0.06, fill: 'rgba(0,0,0,0.08)' },
      // Wall
      { type: 'rect' as const, x: -w / 2, y: -h * 0.2, width: w, height: h * 0.65, fill: colors.wall, stroke: colors.accent, strokeWidth: 0.8 },
      // Roof (triangle)
      { type: 'polygon' as const, points: `${-w * 0.6},${-h * 0.2} 0,${-h * 0.2 - roofH} ${w * 0.6},${-h * 0.2}`, fill: colors.roof, stroke: colors.accent, strokeWidth: 0.8 },
      // Door
      { type: 'rect' as const, x: -w * 0.1, y: h * 0.15, width: w * 0.2, height: h * 0.3, fill: colors.accent, rx: 2 },
      // Windows (left + right)
      { type: 'rect' as const, x: -w * 0.35, y: -h * 0.05, width: w * 0.16, height: h * 0.14, fill: '#FFFFFFCC', stroke: colors.accent, strokeWidth: 0.5, rx: 1 },
      { type: 'rect' as const, x: w * 0.19, y: -h * 0.05, width: w * 0.16, height: h * 0.14, fill: '#FFFFFFCC', stroke: colors.accent, strokeWidth: 0.5, rx: 1 },
      // Flag pole
      { type: 'line' as const, x1: 0, y1: -h * 0.2 - roofH, x2: 0, y2: -h * 0.2 - roofH - size * 0.6, stroke: colors.accent, strokeWidth: 1 },
      // Flag
      { type: 'polygon' as const, points: `0,${-h * 0.2 - roofH - size * 0.6} ${size * 0.5},${-h * 0.2 - roofH - size * 0.45} 0,${-h * 0.2 - roofH - size * 0.3}`, fill: colors.roof },
      // Highlight glow
      ...(highlight ? [{ type: 'rect' as const, x: -w / 2 - 2, y: -h * 0.2 - roofH - 2, width: w + 4, height: h + 4, fill: 'none', stroke: '#FFD700', strokeWidth: 2, rx: 3 }] : []),
    ],
  };
}

/**
 * Residential house for middle zone — pitched roof, chimney
 */
export function renderResidentialHouse(
  size: number,
  colors: ReturnType<typeof getClusterColor>,
  highlight: boolean,
) {
  const w = size * 1.8;
  const h = size * 2.2;
  const roofH = h * 0.35;
  return {
    width: w,
    height: h,
    elements: [
      // Shadow
      { type: 'ellipse' as const, cx: 0, cy: h * 0.45, rx: w * 0.45, ry: h * 0.05, fill: 'rgba(0,0,0,0.07)' },
      // Wall
      { type: 'rect' as const, x: -w / 2, y: -h * 0.1, width: w, height: h * 0.55, fill: colors.wall, stroke: colors.accent, strokeWidth: 0.7 },
      // Roof
      { type: 'polygon' as const, points: `${-w * 0.55},${-h * 0.1} 0,${-h * 0.1 - roofH} ${w * 0.55},${-h * 0.1}`, fill: colors.roof, stroke: colors.accent, strokeWidth: 0.7 },
      // Door
      { type: 'rect' as const, x: -w * 0.09, y: h * 0.15, width: w * 0.18, height: h * 0.28, fill: colors.accent, rx: 2 },
      // Window
      { type: 'rect' as const, x: -w * 0.35, y: 0, width: w * 0.18, height: h * 0.14, fill: '#FFFFFFCC', stroke: colors.accent, strokeWidth: 0.4, rx: 1 },
      // Chimney
      { type: 'rect' as const, x: w * 0.2, y: -h * 0.1 - roofH * 0.5, width: w * 0.12, height: roofH * 0.6, fill: colors.accent },
      // Highlight
      ...(highlight ? [{ type: 'rect' as const, x: -w / 2 - 2, y: -h * 0.1 - roofH - 2, width: w + 4, height: h * 0.55 + roofH + 4, fill: 'none', stroke: '#FFD700', strokeWidth: 1.5, rx: 2 }] : []),
    ],
  };
}

/**
 * Small fragmented house for outer zone
 */
export function renderFragmentedHouse(
  size: number,
  colors: ReturnType<typeof getClusterColor>,
  highlight: boolean,
) {
  const w = size * 1.2;
  const h = size * 1.6;
  const roofH = h * 0.3;
  return {
    width: w,
    height: h,
    elements: [
      { type: 'rect' as const, x: -w / 2, y: -h * 0.05, width: w, height: h * 0.48, fill: colors.wall, stroke: colors.accent, strokeWidth: 0.5 },
      { type: 'polygon' as const, points: `${-w * 0.55},${-h * 0.05} 0,${-h * 0.05 - roofH} ${w * 0.55},${-h * 0.05}`, fill: colors.roof, stroke: colors.accent, strokeWidth: 0.5 },
      { type: 'rect' as const, x: -w * 0.1, y: h * 0.15, width: w * 0.2, height: h * 0.25, fill: colors.accent, rx: 1 },
      ...(highlight ? [{ type: 'rect' as const, x: -w / 2 - 1, y: -h * 0.05 - roofH - 1, width: w + 2, height: h * 0.48 + roofH + 2, fill: 'none', stroke: '#FFD700', strokeWidth: 1.5, rx: 2 }] : []),
    ],
  };
}

/**
 * Tent for inactive nodes
 */
export function renderTent(
  size: number,
  colors: ReturnType<typeof getClusterColor>,
  highlight: boolean,
) {
  const w = size * 1.4;
  const h = size * 1.0;
  return {
    width: w,
    height: h,
    elements: [
      { type: 'polygon' as const, points: `${-w / 2},${h * 0.4} 0,${-h * 0.4} ${w / 2},${h * 0.4}`, fill: colors.wall, stroke: colors.accent, strokeWidth: 0.5 },
      // tent opening
      { type: 'line' as const, x1: 0, y1: -h * 0.4, x2: 0, y2: h * 0.4, stroke: colors.accent, strokeWidth: 0.5 },
      ...(highlight ? [{ type: 'polygon' as const, points: `${-w / 2 - 1},${h * 0.4 + 1} 0,${-h * 0.4 - 1} ${w / 2 + 1},${h * 0.4 + 1}`, fill: 'none', stroke: '#FFD700', strokeWidth: 1.5 }] : []),
    ],
  };
}
