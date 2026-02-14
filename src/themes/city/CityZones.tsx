/**
 * CityZones — renders concentric zone rings with texture masking.
 *
 * Currently uses solid fills as placeholders until SVG texture assets
 * are uploaded. Once assets are in src/assets/city/textures/, replace
 * the <circle> fills with <image> elements clipped by the ring paths.
 */

import { SemanticZoneToken } from '../types';
import { LayoutConfig } from '@/types/graph';

interface CityZonesProps {
  zones: readonly SemanticZoneToken[];
  config: LayoutConfig;
}

// Placeholder zone colors — will be replaced by texture images
const ZONE_STYLES: Record<string, { fill: string; opacity: number }> = {
  core:     { fill: 'hsl(120, 30%, 85%)', opacity: 0.6 },
  middle:   { fill: 'hsl(45, 40%, 88%)', opacity: 0.5 },
  outer:    { fill: 'hsl(20, 30%, 85%)', opacity: 0.45 },
  inactive: { fill: 'hsl(35, 20%, 92%)', opacity: 0.2 },
};

export function CityZones({ zones, config }: CityZonesProps) {
  return (
    <g className="city-zones">
      <defs>
        {/* Clip paths for each zone ring (annulus) */}
        {zones.map((z) => (
          <clipPath key={`clip-${z.zone}`} id={`zone-clip-${z.zone}`}>
            {/* Outer circle */}
            <circle cx={z.centerX} cy={z.centerY} r={z.outerRadius} />
            {/* Inner circle subtracted via evenodd */}
          </clipPath>
        ))}
      </defs>

      {/* Render zones outer-to-inner so inner paints on top */}
      {zones.map((z) => {
        const style = ZONE_STYLES[z.zone] || ZONE_STYLES.inactive;
        return (
          <g key={z.zone}>
            {/*
              Annulus ring: a path with two concentric circles and evenodd fill rule.
              This creates a donut shape that can clip a texture image.
            */}
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
              fill={style.fill}
              opacity={style.opacity}
            />

            {/* Subtle zone boundary line */}
            {z.innerRadius > 0 && (
              <circle
                cx={z.centerX}
                cy={z.centerY}
                r={z.innerRadius}
                fill="none"
                stroke="hsl(0, 0%, 50%)"
                strokeWidth={0.5}
                strokeOpacity={0.15}
                strokeDasharray="4 4"
              />
            )}
          </g>
        );
      })}

      {/* Outer boundary */}
      <circle
        cx={config.centerX}
        cy={config.centerY}
        r={config.outerRadius}
        fill="none"
        stroke="hsl(0, 0%, 40%)"
        strokeWidth={1}
        strokeOpacity={0.2}
        strokeDasharray="6 4"
      />

      {/* Center plaza marker */}
      <circle
        cx={config.centerX}
        cy={config.centerY}
        r={config.greenRadius * 0.08}
        fill="hsl(120, 25%, 65%)"
        opacity={0.5}
      />
    </g>
  );
}
