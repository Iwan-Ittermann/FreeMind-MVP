import { memo } from 'react';
import { SemanticNodeToken, SemanticZone } from '../types';

const NODE_SIZE = 40;
const HALF = NODE_SIZE / 2;

function CoreShape() {
  return (
    <>
      <circle cx="20" cy="20" r="15" stroke="#E0FFFF" strokeWidth="1" fill="none" />
      <path d="M20 5 L24 16 L35 20 L24 24 L20 35 L16 24 L5 20 L16 16 Z" fill="#E0FFFF" />
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
    <>
      <rect x="5" y="5" width="20" height="20" fill="#FF3B3B" fillOpacity="0.6" />
      <rect x="15" y="15" width="20" height="20" fill="#FF3B3B" />
      <path d="M0 20 H40 M20 0 V40" stroke="#FF3B3B" strokeWidth="1" strokeDasharray="2 2" />
    </>
  );
}

function InactiveShape() {
  return (
    <>
      <circle cx="20" cy="20" r="12" stroke="#32394E" strokeWidth="1.5" strokeDasharray="4 2" fill="none" />
      <circle cx="20" cy="20" r="3" fill="#32394E" />
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
  const scale = isHighlighted ? 1.25 : 1;
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
          <rect x={-32} y={-12} width={64} height={16} rx={4} fill="#0B0E1A" fillOpacity={0.92} stroke="#00D4FF" strokeWidth={0.5} strokeOpacity={0.4} />
          <polygon points="-3,4 3,4 0,8" fill="#0B0E1A" fillOpacity={0.92} />
          <text x={0} y={-3} textAnchor="middle" dominantBaseline="central" fill="#E0FFFF" fontSize="5" fontFamily="monospace">
            {bubbleText}
          </text>
        </g>
      )}

      {/* Node shape */}
      <svg
        x={-HALF}
        y={-HALF}
        width={NODE_SIZE}
        height={NODE_SIZE}
        viewBox="0 0 40 40"
        overflow="visible"
        style={{ transform: `scale(${scale})`, transformOrigin: 'center', transition: 'transform 0.15s ease' }}
      >
        <Shape />
      </svg>

      {/* "YOU" flag */}
      {token.isCurrentUser && (
        <g transform={`translate(0, ${HALF - 4})`}>
          <rect x={-1} y={0} width={2} height={12} fill="#32394E" />
          <rect x={1} y={0} width={16} height={9} rx={1} fill="#00D4FF" />
          <text x={9} y={4.5} textAnchor="middle" dominantBaseline="central" fill="#0B0E1A" fontSize="5" fontWeight="bold" fontFamily="monospace">
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
