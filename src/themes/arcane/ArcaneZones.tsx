/**
 * ArcaneZones — concentric zone rings with arcane-themed gradients.
 * Uses olive/khaki tones inspired by the circle texture, rendered inline.
 */

import { SemanticZoneToken } from '../types';
import { LayoutConfig } from '@/types/graph';

interface ArcaneZonesProps {
  zones: readonly SemanticZoneToken[];
  config: LayoutConfig;
}

export function ArcaneZones({ zones, config }: ArcaneZonesProps) {
  const cx = config.centerX;
  const cy = config.centerY;

  return (
    <g className="arcane-zones">
      <defs>
        {/* Arcane core: deep gold / amber */}
        <radialGradient id="arcane-zone-core" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="hsl(45, 55%, 50%)" />
          <stop offset="60%" stopColor="hsl(40, 45%, 38%)" />
          <stop offset="100%" stopColor="hsl(35, 40%, 28%)" />
        </radialGradient>

        {/* Arcane middle: olive green */}
        <radialGradient id="arcane-zone-middle" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="hsl(70, 30%, 42%)" />
          <stop offset="50%" stopColor="hsl(65, 25%, 36%)" />
          <stop offset="100%" stopColor="hsl(60, 20%, 30%)" />
        </radialGradient>

        {/* Arcane outer: khaki / muted earth */}
        <radialGradient id="arcane-zone-outer" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="hsl(50, 25%, 45%)" />
          <stop offset="50%" stopColor="hsl(45, 20%, 38%)" />
          <stop offset="100%" stopColor="hsl(40, 18%, 32%)" />
        </radialGradient>

        {/* Grain noise filter for arcane texture feel */}
        <filter id="arcane-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" result="noise" />
          <feColorMatrix type="saturate" values="0" in="noise" result="mono" />
          <feBlend in="SourceGraphic" in2="mono" mode="multiply" />
        </filter>

        {/* Clip paths for annulus rings */}
        {zones.map((z) => (
          <clipPath key={`clip-${z.zone}`} id={`arcane-clip-${z.zone}`}>
            <path
              d={`
                M ${z.centerX - z.outerRadius} ${z.centerY}
                a ${z.outerRadius} ${z.outerRadius} 0 1 0 ${z.outerRadius * 2} 0
                a ${z.outerRadius} ${z.outerRadius} 0 1 0 ${-z.outerRadius * 2} 0
                Z
                M ${z.centerX - z.innerRadius} ${z.centerY}
                a ${z.innerRadius} ${z.innerRadius} 0 1 0 ${z.innerRadius * 2} 0
                a ${z.innerRadius} ${z.innerRadius} 0 1 0 ${-z.innerRadius * 2} 0
                Z
              `}
              clipRule="evenodd"
            />
          </clipPath>
        ))}
      </defs>

      {zones.map((z) => {
        const gradientId = z.zone === 'inactive' ? null : `arcane-zone-${z.zone}`;
        const diameter = z.outerRadius * 2;

        return (
          <g key={z.zone}>
            {gradientId ? (
              <rect
                x={z.centerX - z.outerRadius}
                y={z.centerY - z.outerRadius}
                width={diameter}
                height={diameter}
                fill={`url(#${gradientId})`}
                clipPath={`url(#arcane-clip-${z.zone})`}
                filter="url(#arcane-grain)"
              />
            ) : (
              <path
                d={`
                  M ${z.centerX - z.outerRadius} ${z.centerY}
                  a ${z.outerRadius} ${z.outerRadius} 0 1 0 ${z.outerRadius * 2} 0
                  a ${z.outerRadius} ${z.outerRadius} 0 1 0 ${-z.outerRadius * 2} 0
                  Z
                  M ${z.centerX - z.innerRadius} ${z.centerY}
                  a ${z.innerRadius} ${z.innerRadius} 0 1 0 ${z.innerRadius * 2} 0
                  a ${z.innerRadius} ${z.innerRadius} 0 1 0 ${-z.innerRadius * 2} 0
                  Z
                `}
                fillRule="evenodd"
                fill="hsl(45, 15%, 25%)"
                opacity={0.15}
              />
            )}

            {/* Zone boundary */}
            {z.innerRadius > 0 && (
              <circle
                cx={z.centerX}
                cy={z.centerY}
                r={z.innerRadius}
                fill="none"
                stroke="hsl(45, 30%, 45%)"
                strokeWidth={0.5}
                strokeOpacity={0.3}
                strokeDasharray="4 4"
              />
            )}
          </g>
        );
      })}

      {/* Outer boundary ring */}
      <circle
        cx={cx}
        cy={cy}
        r={config.outerRadius}
        fill="none"
        stroke="hsl(45, 25%, 40%)"
        strokeWidth={1}
        strokeOpacity={0.35}
        strokeDasharray="6 4"
      />
    </g>
  );
}
