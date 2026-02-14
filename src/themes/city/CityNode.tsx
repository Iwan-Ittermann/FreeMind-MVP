import { memo } from 'react';
import { SemanticNodeToken } from '../types';

// --- SVG asset imports ---
import house1 from '@/assets/city/nodes/middle/house-1.svg';
import house2 from '@/assets/city/nodes/middle/house-2.svg';
import house3 from '@/assets/city/nodes/middle/house-3.svg';
import house4 from '@/assets/city/nodes/middle/house-4.svg';
import house5 from '@/assets/city/nodes/middle/house-5.svg';

import building1 from '@/assets/city/nodes/core/building-1.svg';
import building2 from '@/assets/city/nodes/core/building-2.svg';
import building3 from '@/assets/city/nodes/core/building-3.svg';
import building4 from '@/assets/city/nodes/core/building-4.svg';
import building5 from '@/assets/city/nodes/core/building-5.svg';

import shack1 from '@/assets/city/nodes/outer/shack-1.svg';

const MIDDLE_HOUSES = [house1, house2, house3, house4, house5] as const;
const CORE_BUILDINGS = [building1, building2, building3, building4, building5] as const;

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
  showSpeechBubble: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

const NODE_SIZE = 48;
const HALF = NODE_SIZE / 2;

function getNodeAsset(zone: string, id: string, rank: number): string | null {
  switch (zone) {
    case 'core':
      return CORE_BUILDINGS[rank % CORE_BUILDINGS.length];
    case 'middle':
      return MIDDLE_HOUSES[hashToIndex(id, MIDDLE_HOUSES.length)];
    case 'outer':
      return shack1;
    default:
      return null;
  }
}

function InlineTent() {
  return (
    <g>
      <polygon points="0,-18 -16,10 16,10" fill="hsl(30, 35%, 55%)" stroke="hsl(25, 30%, 40%)" strokeWidth={1} />
      <polygon points="0,10 -5,10 0,-4 5,10" fill="hsl(25, 25%, 35%)" />
      <line x1={0} y1={-18} x2={0} y2={-22} stroke="hsl(25, 30%, 40%)" strokeWidth={1.5} />
    </g>
  );
}

export const CityNode = memo(function CityNode({
  token,
  isHighlighted,
  isDimmed,
  showSpeechBubble,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: CityNodeProps) {
  const assetIndex = hashToIndex(token.id, 5);
  const assetUrl = getNodeAsset(token.zone, token.id, assetIndex);
  const opacity = isDimmed ? 0.4 : token.isHidden ? 0.3 : 1;
  const bubbleText = token.opinionText
    ? (token.opinionText.length > 10 ? token.opinionText.slice(0, 10) + '…' : token.opinionText)
    : '';

  return (
    <g
      transform={`translate(${token.x}, ${token.y})`}
      style={{ cursor: 'pointer', opacity }}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Speech bubble */}
      {showSpeechBubble && bubbleText && (
        <g transform={`translate(0, ${-HALF - 14})`}>
          <rect x={-32} y={-12} width={64} height={16} rx={4} fill="hsl(0, 0%, 100%)" fillOpacity={0.92} />
          <polygon points="-3,4 3,4 0,8" fill="hsl(0, 0%, 100%)" fillOpacity={0.92} />
          <text x={0} y={-3} textAnchor="middle" dominantBaseline="central" fill="hsl(0, 0%, 20%)" fontSize="5" fontFamily="sans-serif">
            {bubbleText}
          </text>
        </g>
      )}

      {/* Node shape */}
      {assetUrl ? (
        <image href={assetUrl} x={-HALF} y={-HALF} width={NODE_SIZE} height={NODE_SIZE} />
      ) : (
        <InlineTent />
      )}

      {/* "YOU" flag at bottom-center */}
      {token.isCurrentUser && (
        <g transform={`translate(0, ${HALF - 4})`}>
          <rect x={-1} y={0} width={2} height={12} fill="hsl(0, 0%, 40%)" />
          <rect x={1} y={0} width={16} height={9} rx={1} fill="hsl(0, 75%, 50%)" />
          <text x={9} y={4.5} textAnchor="middle" dominantBaseline="central" fill="hsl(0, 0%, 100%)" fontSize="5" fontWeight="bold">
            YOU
          </text>
        </g>
      )}

      {/* "Online" sign at left corner */}
      {token.isOnline && !token.isCurrentUser && (
        <g transform={`translate(${-HALF + 2}, ${4})`}>
          <rect x={-14} y={-6} width={28} height={12} rx={2} fill="hsl(140, 70%, 35%)" />
          <text x={0} y={0} textAnchor="middle" dominantBaseline="central" fill="hsl(0, 0%, 100%)" fontSize="5" fontWeight="bold">
            Online
          </text>
        </g>
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
          className="animate-gentle-ring-pulse"
          style={{ transformOrigin: 'center' }}
        />
      )}
    </g>
  );
});
