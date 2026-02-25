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
  const isPending = token.isPending;

  // Pending edges: dim cyan stubs instead of full-length red dashes
  const baseWidth = isPending ? 1 : 1.5;
  const strokeWidth = isHighlighted ? baseWidth * 2 : baseWidth;

  const opacity = isDimmed
    ? 0.08
    : isHighlighted
      ? 0.9
      : isPending
        ? 0.12
        : 0.15 + token.respectLevel * 0.25;

  // All edges use cyan; pending are just much dimmer
  const stroke = '#00D4FF';
  const glowColor = '#00D4FF';

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
        strokeDasharray={isPending ? '6 4' : 'none'}
        strokeLinecap="round"
        className="cursor-pointer"
        onClick={onClick}
      />
    </g>
  );
});
