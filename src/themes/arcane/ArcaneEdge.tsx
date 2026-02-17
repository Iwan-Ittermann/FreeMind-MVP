import { memo, useMemo } from 'react';
import { SemanticEdgeToken } from '../types';

interface ArcaneEdgeProps {
  token: SemanticEdgeToken;
  isHighlighted: boolean;
  isDimmed: boolean;
  onClick: () => void;
}

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

function buildArcanePath(
  sx: number, sy: number, tx: number, ty: number, seed: string,
): string {
  const rng = seededRandom(seed);
  const dx = tx - sx;
  const dy = ty - sy;
  const len = Math.sqrt(dx * dx + dy * dy);
  const px = len > 0 ? -dy / len : 0;
  const py = len > 0 ? dx / len : 0;
  const wobble = Math.min(len * 0.06, 10);
  const c1x = sx + dx * 0.33 + px * (rng() - 0.5) * wobble * 2;
  const c1y = sy + dy * 0.33 + py * (rng() - 0.5) * wobble * 2;
  const c2x = sx + dx * 0.66 + px * (rng() - 0.5) * wobble * 2;
  const c2y = sy + dy * 0.66 + py * (rng() - 0.5) * wobble * 2;
  return `M ${sx} ${sy} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${tx} ${ty}`;
}

export const ArcaneEdge = memo(function ArcaneEdge({
  token, isHighlighted, isDimmed, onClick,
}: ArcaneEdgeProps) {
  const seed = `${token.sourceId}-${token.targetId}`;
  const pathD = useMemo(
    () => buildArcanePath(token.sourceX, token.sourceY, token.targetX, token.targetY, seed),
    [token.sourceX, token.sourceY, token.targetX, token.targetY, seed],
  );

  const baseWidth = 4;
  const strokeWidth = isHighlighted ? baseWidth * 1.6 : baseWidth;
  const opacity = isDimmed ? 0.12 : isHighlighted ? 0.95 : 0.3 + token.respectLevel * 0.4;

  // Arcane palette: golden/amber paths
  const stroke = token.isActive ? '#C4A04A' : '#8B7D5A';

  return (
    <g>
      {token.isActive && (
        <path d={pathD} stroke="#FFD54F" strokeWidth={baseWidth * 3} strokeOpacity={0.15} strokeLinecap="round" fill="none" />
      )}
      <path d={pathD} stroke={token.isActive ? '#7A6530' : '#6B6040'} strokeWidth={strokeWidth + 2} strokeOpacity={opacity * 0.4} strokeLinecap="round" fill="none" />
      <path
        d={pathD}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeOpacity={opacity}
        strokeDasharray={token.isPending ? '8 5' : 'none'}
        strokeLinecap="round"
        fill="none"
        className="cursor-pointer"
        onClick={onClick}
      />
    </g>
  );
});
