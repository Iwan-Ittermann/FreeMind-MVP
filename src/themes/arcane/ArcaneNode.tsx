import { memo } from 'react';
import { SemanticNodeToken } from '../types';

// Sprite sheet imports (each 1024x1024, 3x3 grid)
import coreSpriteUrl from '@/assets/arcane/nodes/core.svg';
import middleSpriteUrl from '@/assets/arcane/nodes/middle.svg';
import outerSpriteUrl from '@/assets/arcane/nodes/outer.svg';
import inactiveSpriteUrl from '@/assets/arcane/nodes/inactive.svg';

const GRID = 341; // ~1024/3
const NODE_SIZE = 48;
const HALF = NODE_SIZE / 2;

function hashToIndex(id: string, count: number): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (Math.imul(31, h) + id.charCodeAt(i)) | 0;
  }
  return (h >>> 0) % count;
}

const ZONE_SPRITES: Record<string, string> = {
  core: coreSpriteUrl,
  middle: middleSpriteUrl,
  outer: outerSpriteUrl,
  inactive: inactiveSpriteUrl,
};

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
  const spriteUrl = ZONE_SPRITES[token.zone] ?? inactiveSpriteUrl;
  const idx = hashToIndex(token.id, 9);
  const col = idx % 3;
  const row = Math.floor(idx / 3);
  const vx = col * GRID;
  const vy = row * GRID;

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
          <rect x={-32} y={-12} width={64} height={16} rx={4} fill="hsl(45, 30%, 90%)" fillOpacity={0.92} />
          <polygon points="-3,4 3,4 0,8" fill="hsl(45, 30%, 90%)" fillOpacity={0.92} />
          <text x={0} y={-3} textAnchor="middle" dominantBaseline="central" fill="hsl(30, 20%, 20%)" fontSize="5" fontFamily="sans-serif">
            {bubbleText}
          </text>
        </g>
      )}

      {/* Sprite-sheet cropped building */}
      <defs>
        <clipPath id={`arcane-clip-${token.id}`}>
          <circle r={HALF} />
        </clipPath>
      </defs>
      <g clipPath={`url(#arcane-clip-${token.id})`}>
        <image
          href={spriteUrl}
          x={-HALF - vx * (NODE_SIZE / GRID)}
          y={-HALF - vy * (NODE_SIZE / GRID)}
          width={1024 * (NODE_SIZE / GRID)}
          height={1024 * (NODE_SIZE / GRID)}
        />
      </g>

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
