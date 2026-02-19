import { SemanticZoneToken } from '../types';
import { LayoutConfig } from '@/types/graph';

interface SignalZonesProps {
  zones: readonly SemanticZoneToken[];
  config: LayoutConfig;
}

export function SignalZones({ zones, config }: SignalZonesProps) {
  const cx = config.centerX;
  const cy = config.centerY;
  const r = config.outerRadius;
  const size = r * 2;

  return (
    <g className="signal-zones">
      {/* CSS radial gradient via foreignObject */}
      <foreignObject x={cx - r} y={cy - r} width={size} height={size}>
        <div
          style={{
            width: size,
            height: size,
            borderRadius: '50%',
            background: `radial-gradient(
              circle,
              rgba(255,255,255,0.15) 0%,
              rgba(11,14,26,1) 20%,
              rgba(0,212,255,0.05) 21%,
              rgba(11,14,26,1) 50%,
              rgba(255,59,59,0.05) 51%,
              rgba(11,14,26,1) 85%,
              rgba(50,57,78,1) 90%,
              rgba(11,14,26,1) 91%
            )`,
            border: '1px solid #1E2A44',
          }}
        />
      </foreignObject>

      {/* Zone boundary rings */}
      {zones.map((z) => (
        z.innerRadius > 0 && (
          <circle
            key={`boundary-${z.zone}`}
            cx={z.centerX}
            cy={z.centerY}
            r={z.innerRadius}
            fill="none"
            stroke="#00D4FF"
            strokeWidth={0.5}
            strokeOpacity={0.15}
            strokeDasharray="4 4"
          />
        )
      ))}

      {/* Outer boundary */}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="#1E2A44"
        strokeWidth={1}
        strokeOpacity={0.5}
      />
    </g>
  );
}
