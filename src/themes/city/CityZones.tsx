/**
 * CityZones — renders concentric zone rings with texture masking.
 *
 * Each zone ring is an annulus (donut) shape defined by inner/outer radii.
 * A texture SVG is placed full-size and clipped to the ring via <clipPath>.
 */

import { SemanticZoneToken } from '../types';
import { LayoutConfig } from '@/types/graph';

// Texture imports — Vite resolves to URL strings
import texCore from '@/assets/city/textures/zone-core.svg';
import texMiddle from '@/assets/city/textures/zone-middle.svg';
import texOuter from '@/assets/city/textures/zone-outer.svg';

interface CityZonesProps {
  zones: readonly SemanticZoneToken[];
  config: LayoutConfig;
}

// Map zone names to their texture asset URLs
const ZONE_TEXTURES: Record<string, string> = {
  core: texCore,
  middle: texMiddle,
  outer: texOuter,
};

// Fallback fills for zones without a texture (e.g. inactive)
const ZONE_FALLBACK: Record<string, { fill: string; opacity: number }> = {
  inactive: { fill: 'hsl(35, 20%, 92%)', opacity: 0.2 },
};

export function CityZones({ zones, config }: CityZonesProps) {
  return (
    <g className="city-zones">
      <defs>
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
        const texture = ZONE_TEXTURES[z.zone];
        const fallback = ZONE_FALLBACK[z.zone];

        // Size the texture image to cover the zone's bounding box
        const diameter = z.outerRadius * 2;

        return (
          <g key={z.zone}>
            {texture ? (
              <image
                href={texture}
                x={z.centerX - z.outerRadius}
                y={z.centerY - z.outerRadius}
                width={diameter}
                height={diameter}
                preserveAspectRatio="xMidYMid slice"
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
    </g>
  );
}
