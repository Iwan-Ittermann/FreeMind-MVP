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
          <feFlood floodColor="#FFDC8C" floodOpacity="0.6" result="goldColor"/>
          <feComposite in="goldColor" in2="coloredBlur" operator="in" result="goldGlow"/>
          <feMerge><feMergeNode in="goldGlow"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <circle cx="20" cy="20" r="14" stroke="#FFFFFF" strokeWidth="1" fill="none" filter="url(#signal-glow-gold)" />
      <path d="M20 8 L23 17 L32 20 L23 23 L20 32 L17 23 L8 20 L17 17 Z" fill="#FFFFFF" filter="url(#signal-glow-gold)" />
    </>
  );
}

function MiddleShape() {
  return (
    <>
      <circle cx="20" cy="20" r="12" stroke="#00D4FF" strokeWidth="2" fill="none" />
      <circle cx="20" cy="20" r="6" fill="#00D4FF" />
    </>
  );
}

function OuterShape() {
  return (
    <rect x="12" y="12" width="16" height="16" fill="#551111" stroke="none" />
  );
}

function InactiveShape() {
  return (
    <>
      <circle cx="20" cy="20" r="12" stroke="#4A5168" strokeWidth="1.5" strokeDasharray="4 2" fill="none" />
      <circle cx="20" cy="20" r="3" fill="#4A5168" />
    </>
  );
}

const ZONE_SHAPE: Record<SemanticZone, () => JSX.Element> = {
  core: CoreShape,
  middle: MiddleShape,
  outer: OuterShape,
  inactive: InactiveShape,
};

interface SignalNodeProps {
  token: SemanticNodeToken;
  isHighlighted: boolean;
  isDimmed: boolean;
  showSpeechBubble: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

export const SignalNode = memo(function SignalNode({
  token, isHighlighted, isDimmed, showSpeechBubble,
  onClick, onMouseEnter, onMouseLeave,
}: SignalNodeProps) {
  const Shape = ZONE_SHAPE[token.zone] ?? InactiveShape;
  const opacity = isDimmed ? 0.4 : token.isHidden ? 0.3 : 1;
  const isScaled = isHighlighted && !isDimmed;
  const bubbleText = token.opinionText
    ? (token.opinionText.length > 16 ? token.opinionText.slice(0, 16) + '…' : token.opinionText)
    : '';

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
        <g transform={`translate(0, ${-HALF - 10})`} opacity={token.zone === 'core' || token.zone === 'middle' ? 0.5 : 0.92}>
          <rect x={-48} y={-16} width={96} height={22} rx={5} fill="#0B0E1A" fillOpacity={0.92} stroke="#00D4FF" strokeWidth={0.5} strokeOpacity={0.4} />
          <polygon points="-4,6 4,6 0,12" fill="#0B0E1A" fillOpacity={0.92} />
          <text x={0} y={-4} textAnchor="middle" dominantBaseline="central" fill="#E0FFFF" fontSize="8" fontFamily="monospace">
            {bubbleText}
          </text>
        </g>
      )}

      {/* Node shape — scale applied here to avoid position jump */}
      <svg
        x={-HALF}
        y={-HALF}
        width={NODE_SIZE}
        height={NODE_SIZE}
        viewBox="0 0 40 40"
        overflow="visible"
        style={{
          transform: isScaled ? 'scale(1.25)' : 'scale(1)',
          transformOrigin: '20px 20px',
          transition: 'transform 0.15s ease',
        }}
      >
        <circle cx="20" cy="20" r="20" fill="transparent" />
        <Shape />
      </svg>

      {/* "YOU" badge — red circle, top-right */}
      {token.isCurrentUser && (
        <g transform={`translate(${HALF * 0.7}, ${-HALF * 0.7})`}>
          <circle r={8} fill="#FF3B3B" />
          <text x={0} y={0.5} textAnchor="middle" dominantBaseline="central" fill="#FFFFFF" fontSize="5" fontWeight="bold" fontFamily="monospace">
            YOU
          </text>
        </g>
      )}

      {/* Online badge */}
      {token.isOnline && !token.isCurrentUser && (
        <g transform={`translate(${-HALF + 2}, ${4})`}>
          <rect x={-14} y={-6} width={28} height={12} rx={2} fill="#00D4FF" fillOpacity={0.8} />
          <text x={0} y={0} textAnchor="middle" dominantBaseline="central" fill="#0B0E1A" fontSize="5" fontWeight="bold" fontFamily="monospace">
            Online
          </text>
        </g>
      )}

      {/* Unread badge */}
      {token.hasUnread && !token.hasIncomingRequest && (
        <g transform={`translate(${HALF * 0.6}, ${-HALF * 0.9})`}>
          <rect x={-6} y={-5} width={12} height={9} rx={1.5} fill="#0B0E1A" stroke="#00D4FF" strokeWidth={0.5} />
          <path d="M-5,-4 L0,0 L5,-4" fill="none" stroke="#00D4FF" strokeWidth={0.5} />
          <circle cx={5} cy={-5} r={5} fill="#FF3B3B" />
          <text x={5} y={-5} textAnchor="middle" dominantBaseline="central" fill="#E0FFFF" fontSize="6" fontWeight="bold" fontFamily="monospace">
            {token.unreadCount > 9 ? '9+' : token.unreadCount}
          </text>
        </g>
      )}

      {/* Incoming request pulse */}
      {token.hasIncomingRequest && !token.isCurrentUser && (
        <circle
          r={HALF * 0.9}
          fill="none"
          stroke="#00D4FF"
          strokeWidth={2}
          className="animate-gentle-ring-pulse"
          style={{ transformOrigin: 'center' }}
        />
      )}
    </g>
  );
});
