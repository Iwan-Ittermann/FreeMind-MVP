import { memo } from 'react';
import { SemanticNodeToken, SemanticZone } from '../types';

const NODE_SIZE = 40;
const HALF = NODE_SIZE / 2;

function CoreShape() {
  return (
    <>
      <defs>
        <filter id="signal-glow-gold">
          <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
          <feFlood floodColor="#DAA520" floodOpacity="0.5" result="goldColor"/>
          <feComposite in="goldColor" in2="coloredBlur" operator="in" result="goldGlow"/>
          <feMerge><feMergeNode in="goldGlow"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="signal-select-glow">
          <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#DAA520" floodOpacity="0.7"/>
        </filter>
      </defs>
      <path d="M20 8 L23 17 L32 20 L23 23 L20 32 L17 23 L8 20 L17 17 Z" fill="#DAA520" filter="url(#signal-glow-gold)" />
    </>
  );
}

function MiddleShape() {
  return (
    <circle cx="20" cy="20" r="12" fill="#8FBC5E" />
  );
}

function OuterShape() {
  return (
    <rect x="12" y="12" width="16" height="16" fill="#CC5500" stroke="none" />
  );
}

function BotShape() {
  return (
    <>
      <circle cx="20" cy="20" r="14" stroke="#A855F7" strokeWidth="2" fill="none" />
      <circle cx="20" cy="20" r="8" fill="#A855F7" fillOpacity="0.6" />
      <text x="20" y="21" textAnchor="middle" dominantBaseline="central" fill="#FFFFFF" fontSize="10" fontWeight="bold" fontFamily="monospace">AI</text>
    </>
  );
}

const ZONE_SHAPE: Record<SemanticZone, () => JSX.Element> = {
  core: CoreShape,
  middle: MiddleShape,
  outer: OuterShape,
};

interface SignalNodeProps {
  token: SemanticNodeToken;
  isHighlighted: boolean;
  isDimmed: boolean;
  showSpeechBubble: boolean;
  scale?: number;
  onClick: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

export const SignalNode = memo(function SignalNode({
  token, isHighlighted, isDimmed, showSpeechBubble, scale = 1,
  onClick, onMouseEnter, onMouseLeave,
}: SignalNodeProps) {
  const Shape = token.isBot ? BotShape : (ZONE_SHAPE[token.zone] ?? MiddleShape);
  const opacity = isDimmed ? 0.4 : token.isHidden ? 0.3 : 1;
  const isScaled = isHighlighted && !isDimmed;
  const bubbleText = token.opinionText
    ? (token.opinionText.length > 16 ? token.opinionText.slice(0, 16) + '…' : token.opinionText)
    : '';

  const scaledHalf = HALF * scale;

  return (
      <g
        transform={`translate(${token.x}, ${token.y})`}
        style={{ cursor: 'pointer', opacity }}
        data-user-node={token.isCurrentUser ? 'true' : undefined}
      data-node-clickable
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Speech bubble */}
      {showSpeechBubble && bubbleText && (
        <g transform={`translate(0, ${-scaledHalf - 14})`} opacity={token.zone === 'core' || token.zone === 'middle' ? 0.5 : 0.92}>
          <rect x={-75} y={-18} width={150} height={28} rx={8} fill="rgba(26,26,46,0.85)" stroke="#DAA520" strokeWidth={0.5} strokeOpacity={0.3} />
          <polygon points="-4,10 4,10 0,16" fill="rgba(26,26,46,0.85)" />
          <text x={0} y={-3} textAnchor="middle" dominantBaseline="central" fill="#FFFFFFE6" fontSize="13" fontFamily="monospace">
            {bubbleText}
          </text>
        </g>
      )}

      {/* Node shape */}
      <svg
        x={-scaledHalf}
        y={-scaledHalf}
        width={NODE_SIZE * scale}
        height={NODE_SIZE * scale}
        viewBox="0 0 40 40"
        overflow="visible"
        style={{
          transform: isScaled ? 'scale(1.25)' : 'scale(1)',
          transformOrigin: '20px 20px',
          transition: 'transform 0.15s ease',
        }}
      >
        <circle cx="20" cy="20" r="22" fill="transparent" />
        {/* Selection highlight — gold to match warm earth palette */}
        {isHighlighted && !isDimmed && (
          <circle cx="20" cy="20" r="18" fill="none" stroke="#DAA520" strokeWidth={2} filter="url(#signal-select-glow)" />
        )}
        <Shape />
      </svg>

      {/* "YOU" badge */}
      {token.isCurrentUser && (
        <g transform={`translate(${scaledHalf * 0.7}, ${-scaledHalf * 0.7})`}>
          <circle r={8 * scale} fill="#FF3B3B" />
          <text x={0} y={0.5} textAnchor="middle" dominantBaseline="central" fill="#FFFFFF" fontSize={5 * scale} fontWeight="bold" fontFamily="monospace">
            YOU
          </text>
        </g>
      )}

      {/* Online badge */}
      {token.isOnline && !token.isCurrentUser && (
        <g transform={`translate(${-scaledHalf + 2}, ${4 * scale})`}>
          <rect x={-14 * scale} y={-6 * scale} width={28 * scale} height={12 * scale} rx={2} fill="#8FBC5E" fillOpacity={0.8} />
          <text x={0} y={0} textAnchor="middle" dominantBaseline="central" fill="#1A1A2E" fontSize={5 * scale} fontWeight="bold" fontFamily="monospace">
            Online
          </text>
        </g>
      )}

      {/* Unread badge — always shows when there are unread messages */}
      {token.hasUnread && (
        <g transform={`translate(${scaledHalf * 0.6}, ${-scaledHalf * 0.9})`}>
          <rect x={-6 * scale} y={-5 * scale} width={12 * scale} height={9 * scale} rx={1.5} fill="#1A1A2E" stroke="#DAA520" strokeWidth={0.5} />
          <path d={`M${-5 * scale},${-4 * scale} L0,0 L${5 * scale},${-4 * scale}`} fill="none" stroke="#DAA520" strokeWidth={0.5} />
          <circle cx={5 * scale} cy={-5 * scale} r={5 * scale} fill="#FF3B3B" />
          <text x={5 * scale} y={-5 * scale} textAnchor="middle" dominantBaseline="central" fill="#E0FFFF" fontSize={6 * scale} fontWeight="bold" fontFamily="monospace">
            {token.unreadCount > 9 ? '9+' : token.unreadCount}
          </text>
        </g>
      )}

      {/* Incoming request pulse */}
      {token.hasIncomingRequest && !token.isCurrentUser && (
        <circle
          r={scaledHalf * 0.9}
          fill="none"
          stroke="#DAA520"
          strokeWidth={2}
          className="animate-gentle-ring-pulse"
          style={{ transformOrigin: 'center' }}
        />
      )}
    </g>
  );
});
