import { memo } from 'react';
import { SemanticNodeToken } from '../types';

import respectful1 from '@/assets/arcane/nodes/respectful-1.png';
import respectful2 from '@/assets/arcane/nodes/respectful-2.png';
import moderate1 from '@/assets/arcane/nodes/moderate-1.png';
import moderate2 from '@/assets/arcane/nodes/moderate-2.png';
import extreme1 from '@/assets/arcane/nodes/extreme-1.png';

const NODE_SIZE = 56;
const HALF = NODE_SIZE / 2;

const ZONE_ASSETS: Record<string, string[]> = {
  core: [respectful1, respectful2],
  middle: [moderate1, moderate2],
  outer: [extreme1],
  inactive: [moderate1],
};

function hashToIndex(id: string, count: number): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (Math.imul(31, h) + id.charCodeAt(i)) | 0;
  }
  return (h >>> 0) % count;
}

interface ArcaneNodeProps {
  token: SemanticNodeToken;
  isHighlighted: boolean;
  isDimmed: boolean;
  showSpeechBubble: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

export const ArcaneNode = memo(function ArcaneNode({
  token,
  isHighlighted,
  isDimmed,
  showSpeechBubble,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: ArcaneNodeProps) {
  const assets = ZONE_ASSETS[token.zone] ?? ZONE_ASSETS.inactive;
  const assetUrl = assets[hashToIndex(token.id, assets.length)];

  const opacity = isDimmed ? 0.4 : token.isHidden ? 0.3 : 1;
  const bubbleText = token.opinionText
    ? (token.opinionText.length > 10 ? token.opinionText.slice(0, 10) + '…' : token.opinionText)
    : '';

  const scale = isHighlighted ? 1.15 : 1;

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
          <rect x={-32} y={-12} width={64} height={16} rx={4} fill="hsl(45, 30%, 90%)" fillOpacity={0.92} />
          <polygon points="-3,4 3,4 0,8" fill="hsl(45, 30%, 90%)" fillOpacity={0.92} />
          <text x={0} y={-3} textAnchor="middle" dominantBaseline="central" fill="hsl(30, 20%, 20%)" fontSize="5" fontFamily="sans-serif">
            {bubbleText}
          </text>
        </g>
      )}

      {/* Node image */}
      <g transform={`scale(${scale})`} style={{ transformOrigin: 'center' }}>
        <image
          href={assetUrl}
          x={-HALF}
          y={-HALF}
          width={NODE_SIZE}
          height={NODE_SIZE}
        />
      </g>

      {/* Highlight ring */}
      {isHighlighted && (
        <circle
          r={HALF + 3}
          fill="none"
          stroke="hsl(45, 80%, 55%)"
          strokeWidth={1.5}
          strokeOpacity={0.7}
        />
      )}

      {/* "YOU" flag */}
      {token.isCurrentUser && (
        <g transform={`translate(0, ${HALF - 4})`}>
          <rect x={-1} y={0} width={2} height={12} fill="hsl(0, 0%, 40%)" />
          <rect x={1} y={0} width={16} height={9} rx={1} fill="hsl(0, 75%, 50%)" />
          <text x={9} y={4.5} textAnchor="middle" dominantBaseline="central" fill="hsl(0, 0%, 100%)" fontSize="5" fontWeight="bold">
            YOU
          </text>
        </g>
      )}

      {/* "Online" badge */}
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
          <rect x={-6} y={-5} width={12} height={9} rx={1.5} fill="hsl(45, 30%, 90%)" stroke="hsl(30, 20%, 40%)" strokeWidth={0.5} />
          <path d="M-5,-4 L0,0 L5,-4" fill="none" stroke="hsl(30, 20%, 40%)" strokeWidth={0.5} />
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
