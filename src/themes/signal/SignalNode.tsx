import { memo, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { SemanticNodeToken, SemanticZone } from '../types';
import { useWediumPresentation } from '@/contexts/WediumPresentationContext';
import wediumNode from '@/assets/wedium-node.png.asset.json';

const NODE_SIZE = 40;
const HALF = NODE_SIZE / 2;

function CoreShape() {
  return (
    <>
      <defs>
        <filter id="signal-glow-cyan">
          <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
          <feFlood floodColor="#00e5ff" floodOpacity="0.5" result="cyanColor"/>
          <feComposite in="cyanColor" in2="coloredBlur" operator="in" result="cyanGlow"/>
          <feMerge><feMergeNode in="cyanGlow"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="signal-select-glow">
          <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#00e5ff" floodOpacity="0.7"/>
        </filter>
      </defs>
      <path d="M20 8 L23 17 L32 20 L23 23 L20 32 L17 23 L8 20 L17 17 Z" fill="#00e5ff" filter="url(#signal-glow-cyan)" />
    </>
  );
}

function MiddleShape() {
  return (
    <circle cx="20" cy="20" r="9" fill="#14B866" />
  );
}

function OuterShape() {
  return (
    <rect x="12" y="12" width="16" height="16" fill="#CC5500" stroke="none" />
  );
}


const STAR_PATH = 'M20 8 L23 17 L32 20 L23 23 L20 32 L17 23 L8 20 L17 17 Z';

/**
 * TT star node. Brightness/size follow the highscore rank: the top of the
 * board burns bright gold, weaker ranks stay quiet so the graph stays readable.
 */
function TTStar({ rankRatio, isTop5, isCurrentUser }: { rankRatio: number; isTop5: boolean; isCurrentUser: boolean }) {
  if (isCurrentUser) {
    return <path d={STAR_PATH} fill="#FF3B3B" filter="url(#signal-glow-red)" />;
  }
  if (isTop5) {
    return <path d={STAR_PATH} fill="#F5C542" filter="url(#signal-glow-gold)" />;
  }
  const f = 1 - Math.max(0, Math.min(1, rankRatio)); // 1 = strong, 0 = weakest
  const scale = 0.78 + f * 0.16;
  const opacity = 0.55 + f * 0.35;
  // Warm gold desaturating towards a pale star as the rank drops.
  const fill = f > 0.5 ? '#EFC562' : '#D8CFB4';
  return (
    <g transform={`translate(20 20) scale(${scale.toFixed(3)}) translate(-20 -20)`}>
      <path d={STAR_PATH} fill={fill} fillOpacity={opacity} />
    </g>
  );
}

/** Not yet in any discussion: hollow, dimmed star — clearly "waiting". */
function InactiveShapeTT() {
  return (
    <g transform="translate(20 20) scale(0.8) translate(-20 -20)">
      <path d={STAR_PATH} fill="#C8DCF5" fillOpacity={0.22} stroke="#D3E1F5" strokeOpacity={0.7} strokeWidth={1.4} />
    </g>
  );
}



function BotShape({ label = 'AI' }: { label?: string }) {
  return (
    <>
      <circle cx="20" cy="20" r="14" stroke="#A855F7" strokeWidth="2" fill="none" />
      <circle cx="20" cy="20" r="8" fill="#A855F7" fillOpacity="0.6" />
      <text x="20" y="21" textAnchor="middle" dominantBaseline="central" fill="#FFFFFF" fontSize="10" fontWeight="bold" fontFamily="monospace">{label}</text>
    </>
  );
}

/** Shared filter defs so glows resolve regardless of which shape renders. */
function SharedDefs() {
  return (
    <defs>
      <filter id="signal-glow-gold">
        <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
        <feFlood floodColor="#F5C542" floodOpacity="0.55" result="goldColor" />
        <feComposite in="goldColor" in2="coloredBlur" operator="in" result="goldGlow" />
        <feMerge><feMergeNode in="goldGlow" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
      <filter id="signal-glow-red">
        <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
        <feFlood floodColor="#FF3B3B" floodOpacity="0.55" result="redColor" />
        <feComposite in="redColor" in2="coloredBlur" operator="in" result="redGlow" />
        <feMerge><feMergeNode in="redGlow" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
      <filter id="signal-select-glow">
        <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#00e5ff" floodOpacity="0.7" />
      </filter>
    </defs>
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
  highlightForTour?: boolean;
  showSpeechBubble: boolean;
  scale?: number;
  /** TT mode: gold core stars, emerald middle circles, smaller black extreme nodes. */
  ttMode?: boolean;
  /** SVG width — needed to compute graph center for fresh-node entrance animation. */
  graphSize?: number;
  onClick: (event: React.MouseEvent<SVGGElement>) => void;
  onPointerDown?: (event: React.PointerEvent<SVGGElement>) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

export const SignalNode = memo(function SignalNode({
  token, isHighlighted, isDimmed, highlightForTour = false, showSpeechBubble, scale = 1, ttMode = false,
  graphSize,
  onClick, onPointerDown, onMouseEnter, onMouseLeave,
}: SignalNodeProps) {
  const { t } = useTranslation();
  const wedium = useWediumPresentation();
  const shapeSet = ZONE_SHAPE;
  const showInactive = ttMode && token.isInactive && !token.isCurrentUser && !token.isBot;
  // TT mode: every opinion is a star, brightness by highscore rank.
  const TTStarShape = () => (
    <TTStar rankRatio={token.rankRatio} isTop5={token.isTop5} isCurrentUser={token.isCurrentUser} />
  );
  const shortBotLabel = token.botLabel?.startsWith('Bot ')
    ? token.botLabel.slice(4)
    : token.botLabel ?? 'AI';
  const Shape = token.isBot
    ? () => <BotShape label={shortBotLabel} />
    : showInactive
      ? InactiveShapeTT
      : ttMode
        ? TTStarShape
        : (shapeSet[token.zone] ?? MiddleShape);

  const opacity = isDimmed ? 0.4 : token.isHidden ? 0.3 : showInactive ? 0.9 : 1;

  const isScaled = isHighlighted && !isDimmed;
  const bubbleText = token.opinionText
    ? (token.opinionText.length > 16 ? token.opinionText.slice(0, 16) + '…' : token.opinionText)
    : '';

  // All TT nodes render at the same size, regardless of ring
  const effectiveScale = wedium ? Math.min(scale, 1) : scale;
  const scaledHalf = HALF * effectiveScale;

  // Detect "freshly added" own opinion: TTCenterCTA writes the opinion id +
  // timestamp to sessionStorage right after submit. We animate the user node
  // from the graph center to its target position once, then clear the flag.
  const animateFromCenter = useMemo(() => {
    if (!ttMode || !token.isCurrentUser || !token.id || !graphSize) return false;
    if (!Number.isFinite(token.x) || !Number.isFinite(token.y) || !Number.isFinite(graphSize)) return false;
    try {
      const raw = sessionStorage.getItem('tt:fresh-opinion');
      if (!raw) return false;
      const parsed = JSON.parse(raw) as { id: string; ts: number };
      if (parsed.id !== token.id) return false;
      if (Date.now() - parsed.ts > 8000) {
        sessionStorage.removeItem('tt:fresh-opinion');
        return false;
      }
      return true;
    } catch { return false; }
  }, [ttMode, token.isCurrentUser, token.id, graphSize, token.x, token.y]);

  const consumedRef = useRef(false);
  const center = graphSize ? graphSize / 2 : 0;

  const groupProps = {
    style: { cursor: 'pointer' as const, opacity },
    'data-user-node': token.isCurrentUser ? 'true' : undefined,
    'data-node-clickable': true,
    'data-tt-node-id': token.id,
    onClick,
    onPointerDown,
    onMouseEnter,
    onMouseLeave,
  };

  const Inner = (
    <>
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
        <SharedDefs />
        <circle cx="20" cy="20" r="22" fill="transparent" />

        {/* Active (already discussing) — soft halo so it reads brighter than inactive nodes */}
        {!wedium && ttMode && !showInactive && !token.isBot && !isDimmed && (
          <circle cx="20" cy="20" r="13" fill="none" stroke="#FFFFFF" strokeOpacity={0.22} strokeWidth={1} />
        )}
        {/* Selection highlight — gold to match warm earth palette */}
        {(highlightForTour || (isHighlighted && !isDimmed)) && (
          <circle cx="20" cy="20" r="18" fill="none" stroke="#00e5ff" strokeWidth={2} filter="url(#signal-select-glow)" />
        )}
        {wedium ? <>
          <circle cx="20" cy="20" r="18" fill="hsl(var(--card))" stroke={token.isCurrentUser || isHighlighted ? 'hsl(var(--primary))' : 'hsl(var(--foreground))'} strokeOpacity={showInactive ? 0.3 : 0.65} strokeWidth="1" />
          <image href={wediumNode.url} x="12" y="6" width="16" height="25" opacity={showInactive ? 0.5 : 1} />
        </> : <Shape />}

        {!wedium && ttMode && token.isCurrentUser && (
          <text
            x="20"
            y="20"
            textAnchor="middle"
            dominantBaseline="middle"
            alignmentBaseline="middle"
            fill="#FFFFFF"
            fontSize="7"
            fontWeight="bold"
            fontFamily="ui-sans-serif, system-ui, sans-serif"
            letterSpacing="-0.2"
            style={{ pointerEvents: 'none' }}
          >
            {t('common.you')}
          </text>
        )}
      </svg>

      {/* "YOU" badge — hidden in TT mode where red color suffices */}
      {token.isCurrentUser && !ttMode && (
        <g transform={`translate(${scaledHalf * 0.7}, ${-scaledHalf * 0.7})`}>
          <circle r={8 * scale} fill="#FF3B3B" />
          <text x={0} y={0.5} textAnchor="middle" dominantBaseline="central" fill="#FFFFFF" fontSize={5 * scale} fontWeight="bold" fontFamily="monospace">
            {t('common.you')}
          </text>
        </g>
      )}

      {/* Online marker — pulsing green dot, top-left of the node */}
      {token.isOnline && !token.isCurrentUser && (
        <g transform={`translate(${-scaledHalf * 0.75}, ${-scaledHalf * 0.75})`} style={{ pointerEvents: 'none' }}>
          <circle r={4.5 * scale} fill="#0B1220" fillOpacity={0.85} />
          <circle r={3 * scale} fill="#22C55E" />
          <circle
            r={3 * scale}
            fill="none"
            stroke="#22C55E"
            strokeWidth={1}
            className="animate-gentle-ring-pulse"
            style={{ transformOrigin: 'center' }}
          />
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

      {/* Total-points count — tiny label to the lower-right of each real node. */}
      {ttMode && !token.isBot && (
        <g transform={`translate(${scaledHalf * 0.72}, ${scaledHalf * 0.62})`} style={{ pointerEvents: 'none' }}>
          <text
            x={0}
            y={0}
            textAnchor="start"
            dominantBaseline="hanging"
            fontSize={11}
            fontFamily="ui-sans-serif, system-ui, sans-serif"
            fontWeight={700}
            stroke="rgba(10,10,20,0.85)"
            strokeWidth={3}
            strokeLinejoin="round"
            paintOrder="stroke"
            fill="#FFFFFF"
          >
            {Math.round(token.bridgingScore).toLocaleString()}
          </text>
        </g>
      )}
    </>
  );



  if (animateFromCenter) {
    if (!consumedRef.current) {
      consumedRef.current = true;
      try { sessionStorage.removeItem('tt:fresh-opinion'); } catch { /* ignore */ }
    }
    return (
      <motion.g
        {...groupProps}
        initial={{ x: center, y: center, scale: 0.4, opacity: 0 }}
        animate={{ x: token.x, y: token.y, scale: 1, opacity }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      >
        {Inner}
      </motion.g>
    );
  }

  return (
    <g {...groupProps} transform={`translate(${token.x}, ${token.y})`}>
      {Inner}
    </g>
  );
});
