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
              radial-gradient(circle closest-side, transparent ${midP - 0.5}%, #2A3347 ${midP}%, transparent ${midP + 0.5}%),
              radial-gradient(circle closest-side, transparent ${outP - 0.5}%, #2A3347 ${outP}%, transparent ${outP + 0.5}%),
              
              radial-gradient(
                circle closest-side,
                rgba(255, 220, 140, 0.05) 0%,
                rgba(255, 220, 140, 0.05) ${coreP}%,
                rgba(0, 229, 255, 0.04) ${coreP}%,
                rgba(0, 229, 255, 0.04) ${midP}%,
                rgba(180, 40, 40, 0.05) ${midP}%,
                rgba(180, 40, 40, 0.05) ${outP}%,
                rgba(0, 0, 0, 0.85) ${outP}%,
                rgba(0, 0, 0, 0.85) ${outP + 5}%,
                rgba(0, 0, 0, 0.6) ${outP + 5}%,
                rgba(0, 0, 0, 0.6) 100%
              )
            `,
          }}
        />
      </foreignObject>

      {/* All 5 numbered lines from center outward */}
      {/* Line 1: Core zone boundary (greenRadius) */}
      <circle cx={cx} cy={cy} r={config.greenRadius} fill="none" stroke="#FFDC8C" strokeWidth={0.5} strokeOpacity={0.20} strokeDasharray="4 4" />
      {/* Core zone label — inside the zone */}
      <text x={cx} y={cy + config.greenRadius * 0.55} textAnchor="middle" fill="#FFDC8C" fillOpacity={0.35} fontSize="8" fontFamily="monospace">Respektvoll</text>

      {/* Line 2: Middle zone boundary (yellowRadius) */}
      <circle cx={cx} cy={cy} r={config.yellowRadius} fill="none" stroke="#00D4FF" strokeWidth={0.5} strokeOpacity={0.20} strokeDasharray="4 4" />
      {/* Middle zone label — inside the zone */}
      <text x={cx} y={cy + (config.greenRadius + config.yellowRadius) / 2 + 3} textAnchor="middle" fill="#00D4FF" fillOpacity={0.30} fontSize="8" fontFamily="monospace">Moderat</text>

      {/* Line 3: Outer/pink zone boundary (pinkRadius) */}
      <circle cx={cx} cy={cy} r={config.pinkRadius} fill="none" stroke="#FF6B6B" strokeWidth={0.5} strokeOpacity={0.20} strokeDasharray="4 4" />
      {/* Outer zone label — inside the zone */}
      <text x={cx} y={cy + (config.yellowRadius + config.pinkRadius) / 2 + 3} textAnchor="middle" fill="#FF6B6B" fillOpacity={0.30} fontSize="8" fontFamily="monospace">Extrem</text>

      {/* Inactive zone label — inside the zone */}
      <text x={cx} y={cy + (config.pinkRadius + r) / 2 + 3} textAnchor="middle" fill="#4A5168" fillOpacity={0.30} fontSize="8" fontFamily="monospace">Offen</text>

    </g>
  );
}
