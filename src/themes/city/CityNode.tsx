import { memo } from 'react';
import { SemanticNodeToken } from '../types';

// --- SVG asset imports (Vite resolves these to URL strings) ---

// Middle zone houses
import house1 from '@/assets/city/nodes/middle/house-1.svg';
import house2 from '@/assets/city/nodes/middle/house-2.svg';
import house3 from '@/assets/city/nodes/middle/house-3.svg';
import house4 from '@/assets/city/nodes/middle/house-4.svg';
import house5 from '@/assets/city/nodes/middle/house-5.svg';

// Core zone buildings
// TODO: building-1 and building-3 render as solid blocks at 48px (no margins).
// Using building-2 for all core slots until properly-cropped assets are provided.
import building2 from '@/assets/city/nodes/core/building-2.svg';

// Outer zone
import shack1 from '@/assets/city/nodes/outer/shack-1.svg';

const MIDDLE_HOUSES = [house1, house2, house3, house4, house5] as const;

// TODO: Replace with 5 unique core buildings when properly-cropped assets are uploaded.
const CORE_BUILDINGS = [building2, building2, building2, building2, building2] as const;

/**
 * Deterministic hash from node ID → index for asset selection.
 */
function hashToIndex(id: string, count: number): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (Math.imul(31, h) + id.charCodeAt(i)) | 0;
  }
  return ((h >>> 0) % count);
}

interface CityNodeProps {
  token: SemanticNodeToken;
  isHighlighted: boolean;
  isDimmed: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

// Uniform display size for all node assets
const NODE_SIZE = 48;
const HALF = NODE_SIZE / 2;

/**
 * Returns the SVG asset URL for a given node based on its zone and ID.
 * Returns null for inactive/tent nodes — those use an inline SVG instead.
 */
function getNodeAsset(zone: string, id: string, rank: number): string | null {
  switch (zone) {
    case 'core':
      return CORE_BUILDINGS[rank % CORE_BUILDINGS.length];
    case 'middle':
      return MIDDLE_HOUSES[hashToIndex(id, MIDDLE_HOUSES.length)];
    case 'outer':
      return shack1;
    default:
      return null; // inactive → inline tent SVG
  }
}

/**
 * Inline tent SVG for inactive/fringe nodes.
 * TODO: Replace with a properly-cropped tent.svg asset when available.
 */
function InlineTent() {
  return (
    <g>
      {/* Tent body — triangular shape */}
      <polygon
        points="0,-18 -16,10 16,10"
        fill="hsl(30, 35%, 55%)"
        stroke="hsl(25, 30%, 40%)"
        strokeWidth={1}
      />
      {/* Tent opening */}
      <polygon
        points="0,10 -5,10 0,-4 5,10"
        fill="hsl(25, 25%, 35%)"
      />
      {/* Tent pole */}
      <line x1={0} y1={-18} x2={0} y2={-22} stroke="hsl(25, 30%, 40%)" strokeWidth={1.5} />
    </g>
  );
}

export const CityNode = memo(function CityNode({
  token,
  isHighlighted,
  isDimmed,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: CityNodeProps) {
  const assetIndex = hashToIndex(token.id, 5);
  const assetUrl = getNodeAsset(token.zone, token.id, assetIndex);

  const opacity = isDimmed ? 0.4 : token.isHidden ? 0.3 : 1;

  return (
    <g
      transform={`translate(${token.x}, ${token.y})`}
      style={{ cursor: 'pointer', opacity }}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Node shape — SVG image or inline tent */}
      {assetUrl ? (
        <image
          href={assetUrl}
          x={-HALF}
          y={-HALF}
          width={NODE_SIZE}
          height={NODE_SIZE}
        />
      ) : (
        <InlineTent />
      )}

      {/* Online indicator — warm window glow */}
      {token.isOnline && !token.isCurrentUser && (
        <rect
          x={3}
          y={-10}
          width={5}
          height={4}
          rx={0.5}
          fill="hsl(48, 90%, 65%)"
          className="animate-pulse"
        />
      )}

      {/* Unread badge */}
      {token.hasUnread && !token.hasIncomingRequest && (
        <g transform={`translate(${HALF * 0.6}, ${-HALF * 0.9})`}>
          <rect x={-6} y={-5} width={12} height={9} rx={1.5} fill="hsl(0, 0%, 100%)" stroke="hsl(0, 0%, 40%)" strokeWidth={0.5} />
          <path d="M-5,-4 L0,0 L5,-4" fill="none" stroke="hsl(0, 0%, 40%)" strokeWidth={0.5} />
          <circle cx={5} cy={-5} r={5} fill="hsl(4, 75%, 50%)" />
          <text x={5} y={-5} textAnchor="middle" dominantBaseline="central" fill="hsl(0, 0%, 100%)" fontSize="6" fontWeight="bold">
            {token.unreadCount > 9 ? '9+' : token.unreadCount}
          </text>
        </g>
      )}

      {/* Incoming request pulse — gentle opacity pulse, no scale */}
      {token.hasIncomingRequest && !token.isCurrentUser && (
        <circle
          r={HALF * 0.9}
          fill="none"
          stroke="hsl(45, 100%, 55%)"
          strokeWidth={2}
          className="animate-gentle-ring-pulse"
          style={{ transformOrigin: 'center' }}
        />
      )}

      {/* Current user glow */}
      {token.isCurrentUser && (
        <circle
          r={HALF * 0.8}
          fill="hsla(48, 100%, 50%, 0.15)"
          className="animate-pulse"
        />
      )}
    </g>
  );
});
