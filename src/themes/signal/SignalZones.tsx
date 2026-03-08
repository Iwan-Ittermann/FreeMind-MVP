import { forwardRef } from 'react';
import { SemanticZoneToken } from '../types';
import { LayoutConfig } from '@/types/graph';

interface SignalZonesProps {
  zones: readonly SemanticZoneToken[];
  config: LayoutConfig;
}

export const SignalZones = forwardRef<SVGGElement, SignalZonesProps>(function SignalZones({ zones, config }, ref) {
  const cx = config.centerX;
  const cy = config.centerY;
  const r = config.outerRadius;
  const size = r * 2;

  // Compute gradient percentages from layout config
  const coreP = (config.greenRadius / r) * 100;
  const midP = (config.yellowRadius / r) * 100;
  const outP = (config.pinkRadius / r) * 100;

  return (
    <g className="signal-zones" ref={ref}>
      {/* CSS radial gradient via foreignObject — Warm Earth palette */}
      <foreignObject x={cx - r} y={cy - r} width={size} height={size}>
        <div
          style={{
            width: size,
            height: size,
            borderRadius: '50%',
            backgroundColor: '#1A1A2E',
            backgroundImage: `
              radial-gradient(circle closest-side, transparent ${midP - 0.5}%, #2D2A3A ${midP}%, transparent ${midP + 0.5}%),
              radial-gradient(circle closest-side, transparent ${outP - 0.5}%, #2D2A3A ${outP}%, transparent ${outP + 0.5}%),
              
              radial-gradient(
                circle closest-side,
                rgba(218, 165, 32, 0.06) 0%,
                rgba(218, 165, 32, 0.06) ${coreP}%,
                rgba(107, 142, 35, 0.05) ${coreP}%,
                rgba(107, 142, 35, 0.05) ${midP}%,
                rgba(204, 85, 0, 0.06) ${midP}%,
                rgba(204, 85, 0, 0.06) ${outP}%,
                rgba(120, 113, 108, 0.04) ${outP}%,
                rgba(120, 113, 108, 0.04) ${outP + 5}%,
                rgba(26, 26, 46, 0.8) ${outP + 5}%,
                rgba(26, 26, 46, 0.8) 100%
              )
            `,
          }}
        />
      </foreignObject>

      {/* Zone boundary circles */}
      {/* Core zone boundary (greenRadius) */}
      <circle cx={cx} cy={cy} r={config.greenRadius} fill="none" stroke="#FFFFFF" strokeWidth={0.5} strokeOpacity={0.25} strokeDasharray="4 4" />
      {/* Core zone label */}
      <text x={cx} y={cy + config.greenRadius * 0.55} textAnchor="middle" fill="#DAA520" fillOpacity={0.30} fontSize="8" fontFamily="monospace">Respektvoll</text>

      {/* Middle zone boundary (yellowRadius) */}
      <circle cx={cx} cy={cy} r={config.yellowRadius} fill="none" stroke="#FFFFFF" strokeWidth={0.5} strokeOpacity={0.25} strokeDasharray="4 4" />
      {/* Middle zone label */}
      <text x={cx} y={cy + (config.greenRadius + config.yellowRadius) / 2 + 3} textAnchor="middle" fill="#8FBC5E" fillOpacity={0.25} fontSize="8" fontFamily="monospace">Moderat</text>

      {/* Outer zone boundary (pinkRadius) */}
      <circle cx={cx} cy={cy} r={config.pinkRadius} fill="none" stroke="#FFFFFF" strokeWidth={0.5} strokeOpacity={0.25} strokeDasharray="4 4" />
      {/* Outer zone label */}
      <text x={cx} y={cy + (config.yellowRadius + config.pinkRadius) / 2 + 3} textAnchor="middle" fill="#CC5500" fillOpacity={0.25} fontSize="8" fontFamily="monospace">Extrem</text>

      {/* Inactive zone label */}
      <text x={cx} y={cy + (config.pinkRadius + r) / 2 + 3} textAnchor="middle" fill="#78716C" fillOpacity={0.25} fontSize="8" fontFamily="monospace">Offen</text>

    </g>
  );
});
