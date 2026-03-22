/**
 * ArcaneZones — concentric zone rings with the original circle texture background.
 */

import { useTranslation } from 'react-i18next';
import { SemanticZoneToken } from '../types';
import { LayoutConfig } from '@/types/graph';
import circleTextureUrl from '@/assets/arcane/textures/circle-texture.svg';

interface ArcaneZonesProps {
  zones: readonly SemanticZoneToken[];
  config: LayoutConfig;
}

export function ArcaneZones({ zones, config }: ArcaneZonesProps) {
  const { t } = useTranslation();
  const cx = config.centerX;
  const cy = config.centerY;

  return (
    <g className="arcane-zones">
      <defs>
        {/* Clip to outer boundary circle */}
        <clipPath id="arcane-outer-clip">
          <circle cx={cx} cy={cy} r={config.outerRadius} />
        </clipPath>
      </defs>

      {/* Full circle texture background, clipped to outer radius */}
      <g clipPath="url(#arcane-outer-clip)">
        <image
          href={circleTextureUrl}
          x={cx - config.outerRadius}
          y={cy - config.outerRadius}
          width={config.outerRadius * 2}
          height={config.outerRadius * 2}
          preserveAspectRatio="xMidYMid slice"
        />
      </g>

      {/* Zone boundary rings */}
      {zones.map((z) => (
        z.innerRadius > 0 && (
          <circle
            key={`boundary-${z.zone}`}
            cx={z.centerX}
            cy={z.centerY}
            r={z.innerRadius}
            fill="none"
            stroke="hsl(45, 30%, 45%)"
            strokeWidth={0.5}
            strokeOpacity={0.3}
            strokeDasharray="4 4"
          />
        )
      ))}

      {/* Zone labels */}
      <text x={cx} y={cy + 4} textAnchor="middle" fill="hsl(45, 30%, 70%)" fillOpacity={0.35} fontSize="8" fontFamily="serif">{t('zones.respectful')}</text>
      <text x={cx} y={cy + config.respectfulRadius + 10} textAnchor="middle" fill="hsl(45, 30%, 60%)" fillOpacity={0.30} fontSize="8" fontFamily="serif">{t('zones.moderate')}</text>
      <text x={cx} y={cy + config.moderateRadius + 10} textAnchor="middle" fill="hsl(45, 30%, 50%)" fillOpacity={0.30} fontSize="8" fontFamily="serif">{t('zones.extreme')}</text>

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
