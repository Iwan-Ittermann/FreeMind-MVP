import { LayoutConfig } from '@/types/graph';

interface ConcentricCirclesProps {
  config: LayoutConfig;
}

export function ConcentricCircles({ config }: ConcentricCirclesProps) {
  const { centerX, centerY, outerRadius, pinkRadius, yellowRadius, greenRadius } = config;

  return (
    <g className="concentric-circles">
      {/* Outer border circle (dotted white) */}
      <circle
        cx={centerX}
        cy={centerY}
        r={outerRadius}
        fill="none"
        stroke="hsl(0 0% 100% / 0.3)"
        strokeWidth={2}
        strokeDasharray="4 4"
      />
      
      {/* Pink/Rose ring (outer) */}
      <circle
        cx={centerX}
        cy={centerY}
        r={pinkRadius}
        fill="hsl(var(--primary))"
        opacity={0.9}
      />
      
      {/* Yellow ring (middle) */}
      <circle
        cx={centerX}
        cy={centerY}
        r={yellowRadius}
        fill="hsl(var(--accent))"
        opacity={0.95}
      />
      
      {/* Green circle (center - consensus zone) */}
      <circle
        cx={centerX}
        cy={centerY}
        r={greenRadius}
        fill="hsl(var(--success))"
        opacity={0.9}
      />
      
      {/* Central crown - goal indicator */}
      <text
        x={centerX}
        y={centerY}
        textAnchor="middle"
        dominantBaseline="central"
        className="pointer-events-none"
        style={{ fontSize: greenRadius * 0.5 }}
      >
        👑
      </text>
    </g>
  );
}
