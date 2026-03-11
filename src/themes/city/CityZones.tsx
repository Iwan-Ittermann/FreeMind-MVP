/**
 * CityZones — renders concentric zone rings with inline SVG gradients.
 * No external texture files needed — renders instantly.
 */

import { useTranslation } from 'react-i18next';
import { SemanticZoneToken } from '../types';
import { LayoutConfig } from '@/types/graph';

interface CityZonesProps {
  zones: readonly SemanticZoneToken[];
  config: LayoutConfig;
}

// Inline fill definitions per zone
const ZONE_FILLS: Record<string, { type: 'gradient'; id: string }> = {
  core: { type: 'gradient', id: 'zone-grad-core' },
  middle: { type: 'gradient', id: 'zone-grad-middle' },
  outer: { type: 'gradient', id: 'zone-grad-outer' },
};

const ZONE_FALLBACK: Record<string, { fill: string; opacity: number }> = {
  inactive: { fill: 'hsl(35, 20%, 92%)', opacity: 0.15 },
};

// Boundary line colors per zone
const ZONE_BOUNDARY_COLOR: Record<string, string> = {
  inactive: 'hsl(30, 40%, 55%)',  // dusty terracotta
};

export function CityZones({ zones, config }: CityZonesProps) {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { t } = useTranslation();
  const cx = config.centerX;
  const cy = config.centerY;

  return (
    <g className="city-zones">
      <defs>
        {/* Core zone: lush green radial gradient */}
        <radialGradient id="zone-grad-core" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="hsl(130, 50%, 45%)" />
          <stop offset="60%" stopColor="hsl(135, 45%, 38%)" />
          <stop offset="100%" stopColor="hsl(140, 40%, 28%)" />
        </radialGradient>

        {/* Middle zone: light green land */}
        <radialGradient id="zone-grad-middle" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="hsl(110, 35%, 55%)" />
          <stop offset="50%" stopColor="hsl(100, 30%, 48%)" />
          <stop offset="100%" stopColor="hsl(90, 25%, 42%)" />
        </radialGradient>

        {/* Outer zone: desert / savanna */}
        <radialGradient id="zone-grad-outer" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="hsl(40, 45%, 60%)" />
          <stop offset="50%" stopColor="hsl(35, 40%, 52%)" />
          <stop offset="100%" stopColor="hsl(30, 35%, 44%)" />
        </radialGradient>

        {/* Annulus clip paths for each zone ring */}
        {zones.map((z) => (
          <clipPath key={`clip-${z.zone}`} id={`zone-clip-${z.zone}`}>
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

      {/* Render zones outer-to-inner so inner paints on top */}
      {zones.map((z) => {
        const gradientFill = ZONE_FILLS[z.zone];
        const fallback = ZONE_FALLBACK[z.zone];
        const diameter = z.outerRadius * 2;
        const boundaryColor = ZONE_BOUNDARY_COLOR[z.zone] || 'hsl(30, 40%, 55%)';

        return (
          <g key={z.zone}>
            {gradientFill ? (
              <rect
                x={z.centerX - z.outerRadius}
                y={z.centerY - z.outerRadius}
                width={diameter}
                height={diameter}
                fill={`url(#${gradientFill.id})`}
                clipPath={`url(#zone-clip-${z.zone})`}
              />
            ) : fallback ? (
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
                fill={fallback.fill}
                opacity={fallback.opacity}
              />
            ) : null}

            {/* Subtle zone boundary line */}
            {z.innerRadius > 0 && (
              <circle
                cx={z.centerX}
                cy={z.centerY}
                r={z.innerRadius}
                fill="none"
                stroke={boundaryColor}
                strokeWidth={0.5}
                strokeOpacity={0.25}
                strokeDasharray="4 4"
              />
            )}
          </g>
        );
      })}

      {/* Zone labels */}
      <text x={cx} y={cy + 4} textAnchor="middle" fill="hsl(0, 0%, 95%)" fillOpacity={0.35} fontSize="8" fontFamily="sans-serif" fontWeight="bold">{t('zones.respectful')}</text>
      <text x={cx} y={cy + config.greenRadius + 10} textAnchor="middle" fill="hsl(0, 0%, 95%)" fillOpacity={0.30} fontSize="8" fontFamily="sans-serif">{t('zones.moderate')}</text>
      <text x={cx} y={cy + config.yellowRadius + 10} textAnchor="middle" fill="hsl(0, 0%, 95%)" fillOpacity={0.30} fontSize="8" fontFamily="sans-serif">{t('zones.extreme')}</text>
      <text x={cx} y={cy + config.pinkRadius + 10} textAnchor="middle" fill="hsl(30, 40%, 55%)" fillOpacity={0.30} fontSize="8" fontFamily="sans-serif">{t('zones.inactive')}</text>

      {/* Outer boundary — warm sand, visible on dark bg */}
      <circle
        cx={cx}
        cy={cy}
        r={config.outerRadius}
        fill="none"
        stroke="hsl(35, 30%, 45%)"
        strokeWidth={1}
        strokeOpacity={0.3}
        strokeDasharray="6 4"
      />
    </g>
  );
}
