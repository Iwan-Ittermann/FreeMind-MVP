import { memo } from 'react';
import { SemanticNodeToken } from '../types';

const NODE_SIZE = 48;
const HALF = NODE_SIZE / 2;

function hashToIndex(id: string, count: number): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (Math.imul(31, h) + id.charCodeAt(i)) | 0;
  }
  return (h >>> 0) % count;
}

// Zone color palettes
const ZONE_STYLES: Record<string, { fill: string; glow: string; stroke: string }> = {
  core: { fill: 'hsl(270, 60%, 30%)', glow: 'hsl(45, 80%, 55%)', stroke: 'hsl(45, 70%, 50%)' },
  middle: { fill: 'hsl(240, 50%, 25%)', glow: 'hsl(180, 60%, 45%)', stroke: 'hsl(180, 50%, 40%)' },
  outer: { fill: 'hsl(200, 40%, 20%)', glow: 'hsl(200, 30%, 35%)', stroke: 'hsl(200, 25%, 35%)' },
  inactive: { fill: 'hsl(260, 10%, 30%)', glow: 'hsl(260, 10%, 40%)', stroke: 'hsl(260, 8%, 35%)' },
};

// Generate rune-like inner lines from node id
function getRuneLines(id: string): { x1: number; y1: number; x2: number; y2: number }[] {
  const idx = hashToIndex(id, 12);
  const r = HALF * 0.6;
  const lines: { x1: number; y1: number; x2: number; y2: number }[] = [];
  const count = 2 + (idx % 2);
  for (let i = 0; i < count; i++) {
    const angle = ((idx + i * 5) % 12) * (Math.PI / 6);
    const angle2 = ((idx + i * 5 + 4) % 12) * (Math.PI / 6);
    lines.push({
      x1: Math.cos(angle) * r * 0.3,
      y1: Math.sin(angle) * r * 0.3,
      x2: Math.cos(angle2) * r,
      y2: Math.sin(angle2) * r,
    });
  }
  return lines;
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
  const style = ZONE_STYLES[token.zone] ?? ZONE_STYLES.inactive;
  const runeLines = getRuneLines(token.id);

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

      {/* Glow filter */}
      <defs>
        <radialGradient id={`arcane-grad-${token.id}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={style.fill} stopOpacity={1} />
          <stop offset="80%" stopColor={style.fill} stopOpacity={0.9} />
          <stop offset="100%" stopColor={style.glow} stopOpacity={0.6} />
        </radialGradient>
        <filter id={`arcane-glow-${token.id}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Main circle with gradient */}
      <circle
        r={HALF}
        fill={`url(#arcane-grad-${token.id})`}
        stroke={style.stroke}
        strokeWidth={isHighlighted ? 2.5 : 1.5}
        filter={`url(#arcane-glow-${token.id})`}
      />

      {/* Rune-like inner decorations */}
      {runeLines.map((line, i) => (
        <line
          key={i}
          x1={line.x1}
          y1={line.y1}
          x2={line.x2}
          y2={line.y2}
          stroke={style.glow}
          strokeWidth={0.8}
          strokeOpacity={0.5}
          strokeLinecap="round"
        />
      ))}

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
