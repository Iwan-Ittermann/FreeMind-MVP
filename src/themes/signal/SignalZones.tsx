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
            backgroundColor: '#121826',
            backgroundImage: `
              radial-gradient(circle, transparent 24.5%, #2A3347 25%, transparent 25.5%),
              radial-gradient(circle, transparent 59.5%, #2A3347 60%, transparent 60.5%),
              radial-gradient(circle, transparent 84.5%, #2A3347 85%, transparent 85.5%),
              radial-gradient(circle, transparent 89.5%, #32394E 90%, transparent 90.5%),
              radial-gradient(
                circle,
                rgba(255, 255, 255, 0.08) 0%,
                rgba(255, 255, 255, 0.08) 25%,
                rgba(0, 229, 255, 0.04) 25%,
                rgba(0, 229, 255, 0.04) 60%,
                rgba(85, 17, 17, 0.06) 60%,
                rgba(85, 17, 17, 0.06) 85%,
                transparent 85%
              )
            `,
            border: '2px solid #2A3347',
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
