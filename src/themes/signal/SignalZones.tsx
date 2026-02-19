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
              
              radial-gradient(circle, transparent ${midP - 0.5}%, #2A3347 ${midP}%, transparent ${midP + 0.5}%),
              radial-gradient(circle, transparent ${outP - 0.5}%, #2A3347 ${outP}%, transparent ${outP + 0.5}%),
              radial-gradient(circle, transparent ${outP + 4.5}%, #32394E ${outP + 5}%, transparent ${outP + 5.5}%),
              radial-gradient(
                circle,
                rgba(0, 229, 255, 0.04) 0%,
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

      {/* All 5 numbered lines from center outward */}
      {/* Line 1: Core zone boundary (greenRadius) */}
      <circle cx={cx} cy={cy} r={config.greenRadius} fill="none" stroke="#00D4FF" strokeWidth={0.5} strokeOpacity={0.15} strokeDasharray="4 4" />
      <text x={cx + config.greenRadius + 4} y={cy - 2} fill="#00D4FF" fillOpacity={0.25} fontSize="8" fontFamily="monospace">1</text>

      {/* Line 2: Middle zone boundary (yellowRadius) */}
      <circle cx={cx} cy={cy} r={config.yellowRadius} fill="none" stroke="#00D4FF" strokeWidth={0.5} strokeOpacity={0.15} strokeDasharray="4 4" />
      <text x={cx + config.yellowRadius + 4} y={cy - 2} fill="#00D4FF" fillOpacity={0.25} fontSize="8" fontFamily="monospace">2</text>

      {/* Line 3: Outer/pink zone boundary (pinkRadius) */}
      <circle cx={cx} cy={cy} r={config.pinkRadius} fill="none" stroke="#00D4FF" strokeWidth={0.5} strokeOpacity={0.15} strokeDasharray="4 4" />
      <text x={cx + config.pinkRadius + 4} y={cy - 2} fill="#00D4FF" fillOpacity={0.25} fontSize="8" fontFamily="monospace">3</text>

      {/* Line 4: Inactive zone ring (rendered by CSS gradient, just add number) */}
      {(() => { const r4 = r * (outP + 5) / 100; return (
        <text x={cx + r4 + 4} y={cy - 2} fill="#00D4FF" fillOpacity={0.25} fontSize="8" fontFamily="monospace">4</text>
      ); })()}

      {/* Line 5: Outer border */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1E2A44" strokeWidth={1} strokeOpacity={0.5} />
      <text x={cx + r + 4} y={cy - 2} fill="#00D4FF" fillOpacity={0.25} fontSize="8" fontFamily="monospace">5</text>
    </g>
  );
}
