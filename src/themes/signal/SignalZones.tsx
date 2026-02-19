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

  // Compute gradient percentages from layout config
  const coreP = (config.greenRadius / r) * 100;
  const midP = (config.yellowRadius / r) * 100;
  const outP = (config.pinkRadius / r) * 100;

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
              radial-gradient(circle, transparent ${coreP - 0.5}%, #2A3347 ${coreP}%, transparent ${coreP + 0.5}%),
              radial-gradient(circle, transparent ${midP - 0.5}%, #2A3347 ${midP}%, transparent ${midP + 0.5}%),
              radial-gradient(circle, transparent ${outP - 0.5}%, #2A3347 ${outP}%, transparent ${outP + 0.5}%),
              radial-gradient(circle, transparent ${outP + 4.5}%, #32394E ${outP + 5}%, transparent ${outP + 5.5}%),
              radial-gradient(
                circle,
                rgba(255, 255, 255, 0.08) 0%,
                rgba(255, 255, 255, 0.08) ${coreP}%,
                rgba(0, 229, 255, 0.04) ${coreP}%,
                rgba(0, 229, 255, 0.04) ${midP}%,
                rgba(85, 17, 17, 0.06) ${midP}%,
                rgba(85, 17, 17, 0.06) ${outP}%,
                rgba(0, 0, 0, 0.6) ${outP}%,
                rgba(0, 0, 0, 0.6) 100%
              )
            `,
            border: '2px solid #2A3347',
          }}
        />
      </foreignObject>

      {/* Zone boundary rings with numbers */}
      {zones.map((z, index) => (
        z.innerRadius > 0 && (
          <g key={`boundary-${z.zone}`}>
            <circle
              cx={z.centerX}
              cy={z.centerY}
              r={z.innerRadius}
              fill="none"
              stroke="#00D4FF"
              strokeWidth={0.5}
              strokeOpacity={0.15}
              strokeDasharray="4 4"
            />
            <text
              x={z.centerX + z.innerRadius + 4}
              y={z.centerY - 2}
              fill="#00D4FF"
              fillOpacity={0.25}
              fontSize="8"
              fontFamily="monospace"
            >
              {index + 1}
            </text>
          </g>
        )
      ))}

      {/* Outer boundary with number */}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="#1E2A44"
        strokeWidth={1}
        strokeOpacity={0.5}
      />
      <text
        x={cx + r + 4}
        y={cy - 2}
        fill="#1E2A44"
        fillOpacity={0.5}
        fontSize="8"
        fontFamily="monospace"
      >
        {zones.length + 1}
      </text>
    </g>
  );
}
