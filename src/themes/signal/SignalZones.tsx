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
              repeating-radial-gradient(
                circle,
                transparent 0,
                transparent 79px,
                rgba(255, 255, 255, 0.05) 80px
              ),
              radial-gradient(
                circle at center,
                rgba(255, 255, 255, 0.15) 0%,
                rgba(0, 229, 255, 0.1) 40%,
                rgba(85, 17, 17, 0.1) 75%,
                rgba(18, 24, 38, 1) 100%
              )
            `,
            border: '2px solid #2A3347',
            boxShadow: '0 0 40px rgba(0, 229, 255, 0.1)',
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
