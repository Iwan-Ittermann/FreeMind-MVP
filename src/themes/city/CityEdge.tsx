import { memo, useMemo } from 'react';
import { SemanticEdgeToken } from '../types';

interface CityEdgeProps {
  token: SemanticEdgeToken;
  isHighlighted: boolean;
  isDimmed: boolean;
  onClick: () => void;
}

/**
 * Simple seeded pseudo-random number generator.
 * Returns values in [0, 1) deterministically based on seed string.
 */
function seededRandom(seed: string): () => number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  }
  return () => {
    h = (Math.imul(h ^ (h >>> 16), 0x45d9f3b)) | 0;
    h = (Math.imul(h ^ (h >>> 13), 0x45d9f3b)) | 0;
    h = (h ^ (h >>> 16)) >>> 0;
    return (h & 0x7fffffff) / 0x7fffffff;
  };
}

/**
 * Generate a natural-looking sandy path between two points.
 * Uses gentle curves with slight random offsets for organic feel.
 */
function buildSandyPath(
  sx: number, sy: number, tx: number, ty: number,
  seed: string,
): string {
  const rng = seededRandom(seed);
  const dx = tx - sx;
  const dy = ty - sy;
  const len = Math.sqrt(dx * dx + dy * dy);

  // Perpendicular unit vector
  const px = len > 0 ? -dy / len : 0;
  const py = len > 0 ? dx / len : 0;

  // Wobble magnitude scales with path length
  const wobble = Math.min(len * 0.08, 12);

  // Two control points at ~1/3 and ~2/3 along the path
  const c1x = sx + dx * 0.33 + px * (rng() - 0.5) * wobble * 2;
  const c1y = sy + dy * 0.33 + py * (rng() - 0.5) * wobble * 2;
  const c2x = sx + dx * 0.66 + px * (rng() - 0.5) * wobble * 2;
  const c2y = sy + dy * 0.66 + py * (rng() - 0.5) * wobble * 2;

  return `M ${sx} ${sy} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${tx} ${ty}`;
}

export const CityEdge = memo(function CityEdge({
  token,
  isHighlighted,
  isDimmed,
  onClick,
}: CityEdgeProps) {
  const seed = `${token.sourceId}-${token.targetId}`;

  const pathD = useMemo(
    () => buildSandyPath(
      token.sourceX, token.sourceY,
      token.targetX, token.targetY,
      seed,
    ),
    [token.sourceX, token.sourceY, token.targetX, token.targetY, seed],
  );

  const baseWidth = 5;
  const strokeWidth = isHighlighted ? baseWidth * 1.6 : baseWidth;
  const opacity = isDimmed ? 0.15 : isHighlighted ? 0.95 : 0.35 + token.respectLevel * 0.4;

  // Sandy color palette
  const stroke = token.isActive
    ? '#C4956A'   // warm terracotta for active paths
    : '#D4B896';  // sandy beige for normal paths

  const filterId = `sand-grain-${seed.replace(/[^a-zA-Z0-9]/g, '')}`;

  return (
    <g>
      {/* SVG filter for sandy grain texture */}
      <defs>
        <filter id={filterId} x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" seed={seed.length} result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.5" />
        </filter>
      </defs>

      {/* Active glow — wider, softer shadow path */}
      {token.isActive && (
        <path
          d={pathD}
          stroke="#FFCC80"
          strokeWidth={baseWidth * 3}
          strokeOpacity={0.2}
          strokeLinecap="round"
          fill="none"
        />
      )}

      {/* Edge highlight border — slightly darker */}
      <path
        d={pathD}
        stroke={token.isActive ? '#A0724E' : '#BFA77A'}
        strokeWidth={strokeWidth + 2}
        strokeOpacity={opacity * 0.5}
        strokeLinecap="round"
        fill="none"
      />

      {/* Main sandy path */}
      <path
        d={pathD}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeOpacity={opacity}
        strokeDasharray={token.isPending ? '8 5' : 'none'}
        strokeLinecap="round"
        fill="none"
        filter={`url(#${filterId})`}
        className="cursor-pointer"
        onClick={onClick}
      />
    </g>
  );
});
