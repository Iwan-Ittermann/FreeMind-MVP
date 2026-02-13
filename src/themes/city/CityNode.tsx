import { memo } from 'react';
import { motion } from 'framer-motion';
import { SemanticNodeToken } from '../types';
import {
  getClusterColor,
  renderPublicBuilding,
  renderResidentialHouse,
  renderFragmentedHouse,
  renderTent,
} from './house-shapes';

interface CityNodeProps {
  token: SemanticNodeToken;
  isHighlighted: boolean;
  isDimmed: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

/** Render a single SVG shape element from house-shapes data */
function renderElement(el: Record<string, any>, i: number) {
  const { type, ...props } = el;
  switch (type) {
    case 'rect': return <rect key={i} {...props} />;
    case 'circle': return <circle key={i} {...props} />;
    case 'ellipse': return <ellipse key={i} {...props} />;
    case 'polygon': return <polygon key={i} {...props} />;
    case 'line': return <line key={i} {...props} />;
    default: return null;
  }
}

export const CityNode = memo(function CityNode({
  token,
  isHighlighted,
  isDimmed,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: CityNodeProps) {
  const colors = getClusterColor(token.clusterId);
  const baseSize = token.radius;

  // Scale by activity level: inactive=0.7x, active up to 1.5x
  const scale = 0.7 + token.activityLevel * 0.8;
  const size = baseSize * scale;

  // Pick shape based on zone
  const shape =
    token.zone === 'core' ? renderPublicBuilding(size, colors, token.isCurrentUser) :
    token.zone === 'middle' ? renderResidentialHouse(size, colors, token.isCurrentUser) :
    token.zone === 'outer' ? renderFragmentedHouse(size, colors, token.isCurrentUser) :
    renderTent(size, colors, token.isCurrentUser);

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
      {/* House shape */}
      {shape.elements.map((el, i) => renderElement(el, i))}

      {/* Online indicator — green lamp in "window" area */}
      {token.isOnline && !token.isCurrentUser && (
        <motion.circle
          cx={size * 0.3}
          cy={-size * 0.1}
          r={size * 0.15}
          fill="#4CAF50"
          initial={{ opacity: 0.5 }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      )}

      {/* Unread badge — envelope icon above roof */}
      {token.hasUnread && !token.hasIncomingRequest && (
        <g transform={`translate(${size * 0.8}, ${-shape.height * 0.5 - size * 0.4})`}>
          <rect x={-6} y={-5} width={12} height={9} rx={1.5} fill="#fff" stroke="#666" strokeWidth={0.5} />
          <path d="M-5,-4 L0,0 L5,-4" fill="none" stroke="#666" strokeWidth={0.5} />
          <circle cx={5} cy={-5} r={5} fill="#E53935" />
          <text x={5} y={-5} textAnchor="middle" dominantBaseline="central" fill="#fff" fontSize="6" fontWeight="bold">
            {token.unreadCount > 9 ? '9+' : token.unreadCount}
          </text>
        </g>
      )}

      {/* Incoming request indicator */}
      {token.hasIncomingRequest && !token.isCurrentUser && (
        <motion.circle
          r={shape.width * 0.7}
          fill="none"
          stroke="#FFC107"
          strokeWidth={2}
          initial={{ opacity: 0.3 }}
          animate={{ opacity: [0.3, 0.8, 0.3], scale: [0.9, 1.1, 0.9] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      )}

      {/* Current user glow */}
      {token.isCurrentUser && (
        <motion.circle
          r={shape.width * 0.6}
          fill="rgba(255, 215, 0, 0.15)"
          animate={{ opacity: [0.1, 0.25, 0.1] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
    </motion.g>
  );
});
