import { memo } from 'react';
import { SemanticNodeToken } from '../types';

// --- SVG asset imports (Vite resolves these to URL strings) ---

// Middle zone houses
import house1 from '@/assets/city/nodes/middle/house-1.svg';
import house2 from '@/assets/city/nodes/middle/house-2.svg';
import house3 from '@/assets/city/nodes/middle/house-3.svg';
import house4 from '@/assets/city/nodes/middle/house-4.svg';
import house5 from '@/assets/city/nodes/middle/house-5.svg';

// Core zone buildings (3 unique assets)
// TODO: Only 3 unique core buildings exist. Slots 4 & 5 double up buildings 1 & 2.
// Replace with 5 unique assets when available.
import building1 from '@/assets/city/nodes/core/building-1.svg';
import building2 from '@/assets/city/nodes/core/building-2.svg';
import building3 from '@/assets/city/nodes/core/building-3.svg';

// Inactive/tent node
import tent from '@/assets/city/nodes/inactive/tent.svg';

// Outer zone
import shack1 from '@/assets/city/nodes/outer/shack-1.svg';

const MIDDLE_HOUSES = [house1, house2, house3, house4, house5] as const;

// TODO: Replace with 5 unique core buildings when assets are uploaded.
// Currently 3 buildings doubled to fill 5 slots.
const CORE_BUILDINGS = [building1, building2, building3, building1, building2] as const;

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
 */
function getNodeAsset(zone: string, id: string, rank: number): string {
  switch (zone) {
    case 'core':
      return CORE_BUILDINGS[rank % CORE_BUILDINGS.length];
    case 'middle':
      return MIDDLE_HOUSES[hashToIndex(id, MIDDLE_HOUSES.length)];
    case 'outer':
      return shack1;
    default:
      return tent;
  }
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
      {/* Node shape — SVG image */}
      <image
        href={assetUrl}
        x={-HALF}
        y={-HALF}
        width={NODE_SIZE}
        height={NODE_SIZE}
      />

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

      {/* Incoming request pulse */}
      {token.hasIncomingRequest && !token.isCurrentUser && (
        <circle
          r={HALF * 0.9}
          fill="none"
          stroke="hsl(45, 100%, 55%)"
          strokeWidth={2}
          className="animate-ping"
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
