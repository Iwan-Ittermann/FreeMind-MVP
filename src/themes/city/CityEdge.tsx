import { memo } from 'react';
import { SemanticEdgeToken } from '../types';

interface CityEdgeProps {
  token: SemanticEdgeToken;
  isHighlighted: boolean;
  isDimmed: boolean;
  onClick: () => void;
}

export const CityEdge = memo(function CityEdge({
  token,
  isHighlighted,
  isDimmed,
  onClick,
}: CityEdgeProps) {
  const baseWidth = 4;
  const strokeWidth = isHighlighted ? baseWidth * 1.5 : baseWidth;
  const opacity = isDimmed ? 0.12 : isHighlighted ? 0.9 : 0.25 + token.respectLevel * 0.4;

  // Road color: warm grey, brighter when active
  const stroke = token.isActive
    ? '#8D6E63'   // warm brown for active roads
    : '#B0BEC5';  // blue-grey for normal roads

  const dasharray = token.isPending ? '6 4' : 'none';

  return (
    <g>
      {/* Active glow */}
      {token.isActive && (
        <line
          x1={token.sourceX} y1={token.sourceY}
          x2={token.targetX} y2={token.targetY}
          stroke="#FFAB91"
          strokeWidth={baseWidth * 2.5}
          strokeOpacity={0.25}
          strokeLinecap="round"
        />
      )}
      <line
        x1={token.sourceX} y1={token.sourceY}
        x2={token.targetX} y2={token.targetY}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeOpacity={opacity}
        strokeDasharray={dasharray}
        strokeLinecap="round"
        className={onClick ? 'cursor-pointer' : ''}
        onClick={onClick}
      />
    </g>
  );
});
