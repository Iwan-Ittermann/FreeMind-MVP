import { forwardRef } from 'react';
import { useTranslation } from 'react-i18next';
import { SemanticZoneToken } from '../types';
import { LayoutConfig } from '@/types/graph';

interface SignalZonesProps {
  zones: readonly SemanticZoneToken[];
  config: LayoutConfig;
}

export const SignalZones = forwardRef<SVGGElement, SignalZonesProps>(function SignalZones({ zones, config }, ref) {
  const { t } = useTranslation();
  const cx = config.centerX;
  const cy = config.centerY;
  const r = config.outerRadius;

  // Glow extends 40% beyond the graph circle
  const glowRadius = r * 1.4;

  // Zone radii — semantic names
  const respectfulR = config.respectfulRadius;
  const moderateR = config.moderateRadius;

  // Zone boundary percentages for radial gradient
  const coreP = (respectfulR / r) * 100;
  const midP = (moderateR / r) * 100;

  // 3 gradient sub-rings in the moderate zone (between respectfulRadius and moderateRadius)
  const modStep = (moderateR - respectfulR) / 3;
  const modRing1 = respectfulR + modStep;
  const modRing2 = respectfulR + modStep * 2;

  return (
    <g className="signal-zones" ref={ref}>
      <defs>
        {/* Atmospheric glow — warm orange top-left */}
        <radialGradient id="signal-glow-warm" cx="30%" cy="30%" r="65%">
          <stop offset="0%" stopColor="hsl(25, 90%, 55%)" stopOpacity={0.28} />
          <stop offset="40%" stopColor="hsl(30, 85%, 50%)" stopOpacity={0.14} />
          <stop offset="70%" stopColor="hsl(35, 80%, 50%)" stopOpacity={0.06} />
          <stop offset="100%" stopColor="hsl(35, 80%, 50%)" stopOpacity={0} />
        </radialGradient>

        {/* Atmospheric glow — cool teal bottom-right */}
        <radialGradient id="signal-glow-cool" cx="70%" cy="70%" r="65%">
          <stop offset="0%" stopColor="hsl(180, 70%, 45%)" stopOpacity={0.24} />
          <stop offset="40%" stopColor="hsl(185, 65%, 42%)" stopOpacity={0.12} />
          <stop offset="70%" stopColor="hsl(185, 60%, 40%)" stopOpacity={0.05} />
          <stop offset="100%" stopColor="hsl(185, 60%, 40%)" stopOpacity={0} />
        </radialGradient>

        {/* Dark core gradient */}
        <radialGradient id="signal-core-gradient" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="hsl(230, 22%, 13%)" stopOpacity={1} />
          <stop offset="50%" stopColor="hsl(228, 25%, 11%)" stopOpacity={1} />
          <stop offset="80%" stopColor="hsl(225, 28%, 9%)" stopOpacity={0.97} />
          <stop offset="100%" stopColor="hsl(225, 30%, 8%)" stopOpacity={0} />
        </radialGradient>

        {/* Moderate zone gradient sub-rings */}
        <radialGradient id="signal-mod-ring-1" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="hsl(220, 20%, 16%)" stopOpacity={0.6} />
          <stop offset="100%" stopColor="hsl(220, 20%, 14%)" stopOpacity={0.3} />
        </radialGradient>
        <radialGradient id="signal-mod-ring-2" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="hsl(215, 18%, 18%)" stopOpacity={0.5} />
          <stop offset="100%" stopColor="hsl(215, 18%, 15%)" stopOpacity={0.25} />
        </radialGradient>
        <radialGradient id="signal-mod-ring-3" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="hsl(210, 16%, 20%)" stopOpacity={0.4} />
          <stop offset="100%" stopColor="hsl(210, 16%, 17%)" stopOpacity={0.2} />
        </radialGradient>

        {/* Ring glow filter */}
        <filter id="signal-ring-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2" />
        </filter>
      </defs>

      {/* Warm glow layer (top-left bias) — extends beyond outer radius */}
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
                hsla(43, 70%, 50%, 0.08) 0%,
                hsla(43, 70%, 50%, 0.08) ${coreP}%,
                hsla(90, 35%, 40%, 0.05) ${coreP}%,
                hsla(90, 35%, 40%, 0.05) ${midP}%,
                hsla(20, 80%, 45%, 0.06) ${midP}%,
                hsla(20, 80%, 45%, 0.06) 100%,
                transparent 100%
              )
            `,
          }}
        />
      </foreignObject>

      {/* 3 gradient sub-rings inside the moderate zone for depth */}
      <circle cx={cx} cy={cy} r={modRing1} fill="none" stroke="url(#signal-mod-ring-1)" strokeWidth={modStep * 0.6} opacity={0.5} />
      <circle cx={cx} cy={cy} r={modRing2} fill="none" stroke="url(#signal-mod-ring-2)" strokeWidth={modStep * 0.6} opacity={0.4} />
      <circle cx={cx} cy={cy} r={moderateR - modStep * 0.15} fill="none" stroke="url(#signal-mod-ring-3)" strokeWidth={modStep * 0.5} opacity={0.35} />

      {/* Discrete level rings — 10 levels, color-coded by zone */}
      {(() => {
        const minR = config.nodeRadius * 2;
        const levelRadii: { level: number; radius: number; zone: 'respectful' | 'moderate' | 'extreme' }[] = [
          { level: 10, radius: minR, zone: 'respectful' },
          { level: 9, radius: respectfulR * 0.33, zone: 'respectful' },
          { level: 8, radius: respectfulR * 0.66, zone: 'respectful' },
          { level: 7, radius: respectfulR, zone: 'respectful' },
          { level: 6, radius: respectfulR + (moderateR - respectfulR) * 0.25, zone: 'moderate' },
          { level: 5, radius: respectfulR + (moderateR - respectfulR) * 0.50, zone: 'moderate' },
          { level: 4, radius: respectfulR + (moderateR - respectfulR) * 0.75, zone: 'moderate' },
          { level: 3, radius: moderateR, zone: 'moderate' },
          { level: 2, radius: moderateR + (r - moderateR) * 0.5, zone: 'extreme' },
          { level: 1, radius: r - config.nodeRadius, zone: 'extreme' },
        ];
        const zoneColors: Record<string, string> = {
          respectful: 'hsla(43, 70%, 50%, 0.18)',
          moderate: 'hsla(90, 35%, 50%, 0.14)',
          extreme: 'hsla(20, 80%, 50%, 0.16)',
        };
        return levelRadii.map(({ level, radius, zone }) => (
          <circle
            key={`level-${level}`}
            cx={cx} cy={cy} r={radius}
            fill="none"
            stroke={zoneColors[zone]}
            strokeWidth={0.5}
          />
        ));
      })()}

      {/* Zone labels — Respectful at center, others at zone borders */}
      <text x={cx} y={cy + 4} textAnchor="middle" fill="white" fillOpacity={0.35} fontSize="8" fontFamily="monospace">
        {t('zones.respectful')}
      </text>
      <text x={cx} y={cy + respectfulR + 10} textAnchor="middle" fill="white" fillOpacity={0.3} fontSize="8" fontFamily="monospace">
        {t('zones.moderate')}
      </text>
      <text x={cx} y={cy + moderateR + 10} textAnchor="middle" fill="white" fillOpacity={0.3} fontSize="8" fontFamily="monospace">
        {t('zones.extreme')}
      </text>
    </g>
  );
});
