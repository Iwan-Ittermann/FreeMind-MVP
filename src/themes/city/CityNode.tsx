import { memo } from 'react';
import { motion } from 'framer-motion';
import { SemanticNodeToken } from '../types';

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
 * Zone-specific placeholder shapes.
 * These will be replaced by <image> elements once SVG assets are uploaded.
 */
function renderCorePlaceholder(rank: number) {
  // Tall building shape
  const colors = ['hsl(210, 50%, 55%)', 'hsl(200, 45%, 50%)', 'hsl(220, 55%, 60%)', 'hsl(190, 40%, 52%)', 'hsl(230, 50%, 58%)'];
  const color = colors[rank % colors.length];
  const bh = 30 + rank * 3;
  return (
    <g>
      <rect x={-10} y={-bh} width={20} height={bh} fill={color} rx={2} />
      <rect x={-12} y={-bh} width={24} height={4} fill={color} rx={1} opacity={0.7} />
      {/* Windows */}
      {Array.from({ length: Math.min(4, Math.floor(bh / 8)) }).map((_, i) => (
        <rect key={i} x={-5} y={-bh + 6 + i * 8} width={4} height={3} fill="hsl(48, 80%, 75%)" rx={0.5} />
      ))}
    </g>
  );
}

function renderMiddlePlaceholder(index: number) {
  // Residential house shape
  const roofColors = ['hsl(15, 60%, 50%)', 'hsl(25, 55%, 55%)', 'hsl(35, 50%, 50%)', 'hsl(10, 65%, 48%)', 'hsl(30, 45%, 52%)'];
  const wallColors = ['hsl(40, 30%, 85%)', 'hsl(35, 25%, 80%)', 'hsl(45, 20%, 82%)', 'hsl(30, 35%, 78%)', 'hsl(38, 28%, 83%)'];
  return (
    <g>
      {/* Walls */}
      <rect x={-12} y={-14} width={24} height={18} fill={wallColors[index % wallColors.length]} rx={1} />
      {/* Roof */}
      <polygon points="-15,-14 0,-26 15,-14" fill={roofColors[index % roofColors.length]} />
      {/* Door */}
      <rect x={-3} y={-4} width={6} height={8} fill="hsl(25, 40%, 35%)" rx={1} />
      {/* Window */}
      <rect x={-10} y={-10} width={5} height={4} fill="hsl(200, 30%, 75%)" rx={0.5} />
    </g>
  );
}

function renderOuterPlaceholder() {
  // Basic shack
  return (
    <g>
      <rect x={-10} y={-10} width={20} height={14} fill="hsl(30, 25%, 65%)" rx={1} />
      <polygon points="-12,-10 0,-18 12,-10" fill="hsl(20, 30%, 50%)" />
      <rect x={-3} y={-2} width={6} height={6} fill="hsl(25, 35%, 40%)" rx={0.5} />
    </g>
  );
}

function renderTentPlaceholder() {
  return (
    <g>
      <polygon points="-12,4 0,-14 12,4" fill="hsl(35, 45%, 70%)" stroke="hsl(30, 30%, 50%)" strokeWidth={0.5} />
      <line x1={0} y1={-14} x2={0} y2={4} stroke="hsl(30, 25%, 45%)" strokeWidth={0.8} />
    </g>
  );
}

export const CityNode = memo(function CityNode({
  token,
  isHighlighted,
  isDimmed,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: CityNodeProps) {
  // Pick shape based on zone
  const assetIndex = hashToIndex(token.id, 5);
  const shape = (() => {
    switch (token.zone) {
      case 'core': return renderCorePlaceholder(assetIndex);
      case 'middle': return renderMiddlePlaceholder(assetIndex);
      case 'outer': return renderOuterPlaceholder();
      default: return renderTentPlaceholder();
    }
  })();

  return (
    <motion.g
      initial={{ opacity: 0, scale: 0 }}
      animate={{
        opacity: isDimmed ? 0.4 : token.isHidden ? 0.3 : 1,
        scale: 1,
        x: token.x,
        y: token.y,
      }}
      transition={{
        opacity: { duration: 0.3 },
        scale: { type: 'spring', stiffness: 100, damping: 15 },
        x: { type: 'spring', stiffness: 50, damping: 20 },
        y: { type: 'spring', stiffness: 50, damping: 20 },
      }}
      style={{ cursor: 'pointer' }}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Node shape */}
      {shape}

      {/* Online indicator — warm window glow */}
      {token.isOnline && !token.isCurrentUser && (
        <motion.rect
          x={3}
          y={-10}
          width={5}
          height={4}
          rx={0.5}
          fill="hsl(48, 90%, 65%)"
          initial={{ opacity: 0.4 }}
          animate={{ opacity: [0.4, 0.9, 0.4] }}
          transition={{ duration: 1.5, repeat: Infinity }}
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
        <motion.circle
          r={HALF * 0.9}
          fill="none"
          stroke="hsl(45, 100%, 55%)"
          strokeWidth={2}
          initial={{ opacity: 0.3 }}
          animate={{ opacity: [0.3, 0.8, 0.3], scale: [0.9, 1.1, 0.9] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      )}

      {/* Current user glow */}
      {token.isCurrentUser && (
        <motion.circle
          r={HALF * 0.8}
          fill="hsla(48, 100%, 50%, 0.15)"
          animate={{ opacity: [0.1, 0.25, 0.1] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
    </motion.g>
  );
});
