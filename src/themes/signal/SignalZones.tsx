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

  // Glow extends 40% beyond the graph circle
  const glowRadius = r * 1.4;
  const glowSize = glowRadius * 2;

  // Ring radii — 5 concentric ripples extending beyond outerRadius
  const ringRadii = [
    r * 0.35,
    r * 0.55,
    r * 0.75,
    r * 0.95,
    r * 1.15,
  ];

  // Zone boundary percentages for inner gradients
  const coreP = (config.greenRadius / r) * 100;
  const midP = (config.yellowRadius / r) * 100;
  const outP = (config.pinkRadius / r) * 100;

  return (
    <g className="signal-zones" ref={ref}>
      {/* Atmospheric glow — warm amber top-left, cool teal bottom-right */}
      <defs>
        <radialGradient id="signal-glow-warm" cx="35%" cy="35%" r="60%">
          <stop offset="0%" stopColor="hsl(35, 80%, 55%)" stopOpacity={0.12} />
          <stop offset="60%" stopColor="hsl(35, 80%, 55%)" stopOpacity={0.04} />
          <stop offset="100%" stopColor="hsl(35, 80%, 55%)" stopOpacity={0} />
        </radialGradient>
        <radialGradient id="signal-glow-cool" cx="65%" cy="65%" r="60%">
          <stop offset="0%" stopColor="hsl(185, 60%, 45%)" stopOpacity={0.10} />
          <stop offset="60%" stopColor="hsl(185, 60%, 45%)" stopOpacity={0.03} />
          <stop offset="100%" stopColor="hsl(185, 60%, 45%)" stopOpacity={0} />
        </radialGradient>
        <radialGradient id="signal-core-gradient" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="hsl(230, 20%, 14%)" stopOpacity={1} />
          <stop offset="55%" stopColor="hsl(230, 25%, 11%)" stopOpacity={1} />
          <stop offset="85%" stopColor="hsl(225, 30%, 8%)" stopOpacity={0.95} />
          <stop offset="100%" stopColor="hsl(225, 30%, 8%)" stopOpacity={0} />
        </radialGradient>
      </defs>

      {/* Warm glow layer (top-left bias) */}
      <circle cx={cx} cy={cy} r={glowRadius} fill="url(#signal-glow-warm)" />
      {/* Cool glow layer (bottom-right bias) */}
      <circle cx={cx} cy={cy} r={glowRadius} fill="url(#signal-glow-cool)" />

      {/* Dark anthracite core with soft edge */}
      <circle cx={cx} cy={cy} r={r} fill="url(#signal-core-gradient)" />

      {/* Zone tints via foreignObject */}
      <foreignObject x={cx - r} y={cy - r} width={r * 2} height={r * 2}>
        <div
          style={{
            width: r * 2,
            height: r * 2,
            borderRadius: '50%',
            backgroundImage: `
              radial-gradient(
                circle closest-side,
                hsla(43, 70%, 50%, 0.07) 0%,
                hsla(43, 70%, 50%, 0.07) ${coreP}%,
                hsla(90, 35%, 40%, 0.05) ${coreP}%,
                hsla(90, 35%, 40%, 0.05) ${midP}%,
                hsla(20, 80%, 45%, 0.06) ${midP}%,
                hsla(20, 80%, 45%, 0.06) ${outP}%,
                hsla(30, 10%, 40%, 0.03) ${outP}%,
                transparent ${outP + 8}%
              )
            `,
          }}
        />
      </foreignObject>

      {/* Concentric ripple rings with soft glow */}
      {ringRadii.map((ringR, i) => (
        <g key={i}>
          {/* Glow ring */}
          <circle
            cx={cx} cy={cy} r={ringR}
            fill="none"
            stroke="hsla(0, 0%, 100%, 0.03)"
            strokeWidth={4}
          />
          {/* Crisp ring */}
          <circle
            cx={cx} cy={cy} r={ringR}
            fill="none"
            stroke="hsla(0, 0%, 100%, 0.08)"
            strokeWidth={0.5}
          />
        </g>
      ))}

      {/* Zone boundary circles — dashed, subtle */}
      <circle cx={cx} cy={cy} r={config.greenRadius} fill="none" stroke="hsla(0,0%,100%,0.18)" strokeWidth={0.5} strokeDasharray="4 4" />
      <circle cx={cx} cy={cy} r={config.yellowRadius} fill="none" stroke="hsla(0,0%,100%,0.18)" strokeWidth={0.5} strokeDasharray="4 4" />
      <circle cx={cx} cy={cy} r={config.pinkRadius} fill="none" stroke="hsla(0,0%,100%,0.18)" strokeWidth={0.5} strokeDasharray="4 4" />

      {/* Zone labels */}
      <text x={cx} y={cy + config.greenRadius * 0.55} textAnchor="middle" fill="hsl(43, 70%, 50%)" fillOpacity={0.25} fontSize="8" fontFamily="monospace">Respektvoll</text>
      <text x={cx} y={cy + (config.greenRadius + config.yellowRadius) / 2 + 3} textAnchor="middle" fill="hsl(90, 35%, 50%)" fillOpacity={0.20} fontSize="8" fontFamily="monospace">Moderat</text>
      <text x={cx} y={cy + (config.yellowRadius + config.pinkRadius) / 2 + 3} textAnchor="middle" fill="hsl(20, 80%, 50%)" fillOpacity={0.20} fontSize="8" fontFamily="monospace">Extrem</text>
      <text x={cx} y={cy + (config.pinkRadius + r) / 2 + 3} textAnchor="middle" fill="hsl(30, 10%, 50%)" fillOpacity={0.20} fontSize="8" fontFamily="monospace">Offen</text>
    </g>
  );
});
