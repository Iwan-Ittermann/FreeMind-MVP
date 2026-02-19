import { memo } from 'react';
import { SemanticEdgeToken } from '../types';

interface SignalEdgeProps {
  token: SemanticEdgeToken;
  isHighlighted: boolean;
  isDimmed: boolean;
  onClick: () => void;
}

export const SignalEdge = memo(function SignalEdge({
  token, isHighlighted, isDimmed, onClick,
}: SignalEdgeProps) {
  const baseWidth = 1.5;
  const strokeWidth = isHighlighted ? baseWidth * 2 : baseWidth;
  const opacity = isDimmed ? 0.08 : isHighlighted ? 0.9 : 0.2 + token.respectLevel * 0.4;

  const stroke = token.isPending ? '#FF3B3B' : '#00D4FF';
  const glowColor = token.isPending ? '#FF3B3B' : '#00D4FF';

  return (
    <g>
      {/* Glow layer */}
      {(isHighlighted || token.isActive) && (
        <line
          x1={token.sourceX} y1={token.sourceY}
          x2={token.targetX} y2={token.targetY}
          stroke={glowColor}
          strokeWidth={strokeWidth * 3}
          strokeOpacity={0.15}
          strokeLinecap="round"
        />
      )}
      <line
        x1={token.sourceX} y1={token.sourceY}
        x2={token.targetX} y2={token.targetY}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeOpacity={opacity}
        strokeDasharray={token.isPending ? '6 4' : 'none'}
        strokeLinecap="round"
        className="cursor-pointer"
        onClick={onClick}
      />
    </g>
  );
});
