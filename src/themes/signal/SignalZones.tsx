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
                rgba(255, 220, 140, 0.10) 0%,
                rgba(255, 220, 140, 0.10) ${coreP}%,
                rgba(0, 229, 255, 0.08) ${coreP}%,
                rgba(0, 229, 255, 0.08) ${midP}%,
                rgba(180, 40, 40, 0.10) ${midP}%,
                rgba(180, 40, 40, 0.10) ${outP}%,
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
      <circle cx={cx} cy={cy} r={config.greenRadius} fill="none" stroke="#FFDC8C" strokeWidth={0.5} strokeOpacity={0.30} strokeDasharray="4 4" />
      <text x={cx + config.greenRadius + 4} y={cy - 2} fill="#FFDC8C" fillOpacity={0.35} fontSize="9" fontFamily="monospace">CORE</text>

      {/* Line 2: Middle zone boundary (yellowRadius) */}
      <circle cx={cx} cy={cy} r={config.yellowRadius} fill="none" stroke="#00D4FF" strokeWidth={0.5} strokeOpacity={0.30} strokeDasharray="4 4" />
      <text x={cx + config.yellowRadius + 4} y={cy - 2} fill="#00D4FF" fillOpacity={0.35} fontSize="9" fontFamily="monospace">MID</text>

      {/* Line 3: Outer/pink zone boundary (pinkRadius) */}
      <circle cx={cx} cy={cy} r={config.pinkRadius} fill="none" stroke="#FF6B6B" strokeWidth={0.5} strokeOpacity={0.30} strokeDasharray="4 4" />
      <text x={cx + config.pinkRadius + 4} y={cy - 2} fill="#FF6B6B" fillOpacity={0.35} fontSize="9" fontFamily="monospace">OUTER</text>

      {/* Line 4: Inactive zone ring (rendered by CSS gradient, just add label) */}
      {(() => { const r4 = r * (outP + 5) / 100; return (
        <text x={cx + r4 + 4} y={cy - 2} fill="#4A5168" fillOpacity={0.35} fontSize="9" fontFamily="monospace">INACTIVE</text>
      ); })()}

    </g>
  );
}
