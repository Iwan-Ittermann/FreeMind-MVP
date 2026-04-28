import { memo } from 'react';
import { SemanticNodeToken, SemanticZone } from '../types';

const NODE_SIZE = 40;
const HALF = NODE_SIZE / 2;

interface ShapeProps {
  color?: string | null;
}

function CoreShape({ color = '#00e5ff' }: ShapeProps) {
  const glowId = color ? `signal-glow-core-${color.replace(/[^a-zA-Z0-9]/g, '')}` : 'signal-glow-cyan';
  return (
    <>
      <defs>
        <filter id={glowId}>
          <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
          <feFlood floodColor={color ?? '#00e5ff'} floodOpacity="0.5" result="cyanColor"/>
          <feComposite in="cyanColor" in2="coloredBlur" operator="in" result="cyanGlow"/>
          <feMerge><feMergeNode in="cyanGlow"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="signal-select-glow">
          <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#00e5ff" floodOpacity="0.7"/>
        </filter>
      </defs>
      <path d="M20 8 L23 17 L32 20 L23 23 L20 32 L17 23 L8 20 L17 17 Z" fill={color ?? '#00e5ff'} filter={`url(#${glowId})`} />
    </>
  );
}

function CoreShapeGold() {
  return (
    <>
      <defs>
        <filter id="signal-glow-gold">
          <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
          <feFlood floodColor="#F5C542" floodOpacity="0.55" result="goldColor"/>
          <feComposite in="goldColor" in2="coloredBlur" operator="in" result="goldGlow"/>
          <feMerge><feMergeNode in="goldGlow"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <path d="M20 8 L23 17 L32 20 L23 23 L20 32 L17 23 L8 20 L17 17 Z" fill="#F5C542" filter="url(#signal-glow-gold)" />
    </>
  );
}

function CoreShapeRed() {
  return (
    <>
      <defs>
        <filter id="signal-glow-red">
          <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
          <feFlood floodColor="#FF3B3B" floodOpacity="0.55" result="redColor"/>
          <feComposite in="redColor" in2="coloredBlur" operator="in" result="redGlow"/>
          <feMerge><feMergeNode in="redGlow"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <path d="M20 8 L23 17 L32 20 L23 23 L20 32 L17 23 L8 20 L17 17 Z" fill="#FF3B3B" filter="url(#signal-glow-red)" />
    </>
  );
}

function MiddleShape({ color = '#14B866' }: ShapeProps) {
  return (
    <circle cx="20" cy="20" r="9" fill={color ?? '#14B866'} />
  );
}

function MiddleShapeEmerald() {
  return (
    <circle cx="20" cy="20" r="9" fill="#10B981" />
  );
}

function MiddleShapeRed() {
  return (
    <circle cx="20" cy="20" r="9" fill="#FF3B3B" />
  );
}

function OuterShape({ color = '#CC5500' }: ShapeProps) {
  return (
    <rect x="12" y="12" width="16" height="16" fill={color ?? '#CC5500'} stroke="none" />
  );
}

function OuterShapeBlack() {
  return (
    <rect x="15" y="15" width="10" height="10" fill="#0a0a0a" stroke="none" />
  );
}

function OuterShapeRed() {
  return (
    <rect x="15" y="15" width="10" height="10" fill="#FF3B3B" stroke="none" />
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

const ZONE_SHAPE: Record<SemanticZone, (props: ShapeProps) => JSX.Element> = {
  core: CoreShape,
  middle: MiddleShape,
  outer: OuterShape,
};

const ZONE_SHAPE_TT: Record<SemanticZone, () => JSX.Element> = {
  core: CoreShapeGold,
  middle: MiddleShapeEmerald,
  outer: OuterShapeBlack,
};

const ZONE_SHAPE_TT_USER: Record<SemanticZone, () => JSX.Element> = {
  core: CoreShapeRed,
  middle: MiddleShapeRed,
  outer: OuterShapeRed,
};

interface SignalNodeProps {
  token: SemanticNodeToken;
  isHighlighted: boolean;
  isDimmed: boolean;
  highlightForTour?: boolean;
  showSpeechBubble: boolean;
  scale?: number;
  /** TT mode: gold core stars, emerald middle circles, smaller black extreme nodes. */
  ttMode?: boolean;
  onClick: (event: React.MouseEvent<SVGGElement>) => void;
  onPointerDown?: (event: React.PointerEvent<SVGGElement>) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

export const SignalNode = memo(function SignalNode({
  token, isHighlighted, isDimmed, highlightForTour = false, showSpeechBubble, scale = 1, ttMode = false,
  onClick, onPointerDown, onMouseEnter, onMouseLeave,
}: SignalNodeProps) {
  const shapeSet = ttMode
    ? (token.isCurrentUser ? ZONE_SHAPE_TT_USER : ZONE_SHAPE_TT)
    : ZONE_SHAPE;
  const Shape = token.isBot ? BotShape : (shapeSet[token.zone] ?? MiddleShape);
  const clusterColor = !token.isCurrentUser && !token.isBot ? token.clusterColor : null;
  const opacity = isDimmed ? 0.4 : token.isHidden ? 0.3 : 1;
  const isScaled = isHighlighted && !isDimmed;
  const bubbleText = token.opinionText
    ? (token.opinionText.length > 16 ? token.opinionText.slice(0, 16) + '…' : token.opinionText)
    : '';

  // TT extreme nodes are visually smaller (× 0.6)
  const effectiveScale = ttMode && !token.isBot && token.zone === 'outer' ? scale * 0.6 : scale;
  const scaledHalf = HALF * effectiveScale;

  return (
      <g
        transform={`translate(${token.x}, ${token.y})`}
        style={{ cursor: 'pointer', opacity }}
        data-user-node={token.isCurrentUser ? 'true' : undefined}
      data-node-clickable
      onClick={onClick}
      onPointerDown={onPointerDown}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Speech bubble */}
      {showSpeechBubble && bubbleText && (
        <g transform={`translate(0, ${-scaledHalf - 14})`} opacity={token.zone === 'core' || token.zone === 'middle' ? 0.5 : 0.92}>
          <rect x={-75} y={-18} width={150} height={28} rx={8} fill="rgba(26,26,46,0.85)" stroke="#00e5ff" strokeWidth={0.5} strokeOpacity={0.3} />
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
        width={NODE_SIZE * effectiveScale}
        height={NODE_SIZE * effectiveScale}
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
        {(highlightForTour || (isHighlighted && !isDimmed)) && (
          <circle cx="20" cy="20" r="18" fill="none" stroke="#00e5ff" strokeWidth={2} filter="url(#signal-select-glow)" />
        )}
        <Shape color={clusterColor} />
      </svg>

      {/* "YOU" badge — hidden in TT mode where red color suffices */}
      {token.isCurrentUser && !ttMode && (
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
          <rect x={-14 * scale} y={-6 * scale} width={28 * scale} height={12 * scale} rx={2} fill="#14B866" fillOpacity={0.8} />
          <text x={0} y={0} textAnchor="middle" dominantBaseline="central" fill="#1A1A2E" fontSize={5 * scale} fontWeight="bold" fontFamily="monospace">
            Online
          </text>
        </g>
      )}

      {/* Unread badge — always shows when there are unread messages */}
      {token.hasUnread && (
        <g transform={`translate(${scaledHalf * 0.6}, ${-scaledHalf * 0.9})`}>
          <rect x={-6 * scale} y={-5 * scale} width={12 * scale} height={9 * scale} rx={1.5} fill="#1A1A2E" stroke="#00e5ff" strokeWidth={0.5} />
          <path d={`M${-5 * scale},${-4 * scale} L0,0 L${5 * scale},${-4 * scale}`} fill="none" stroke="#00e5ff" strokeWidth={0.5} />
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
          stroke="#00e5ff"
          strokeWidth={2}
          className="animate-gentle-ring-pulse"
          style={{ transformOrigin: 'center' }}
        />
      )}
    </g>
  );
});
