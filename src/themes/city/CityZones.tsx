import { SemanticZoneToken } from '../types';
import { LayoutConfig } from '@/types/graph';

interface CityZonesProps {
  zones: readonly SemanticZoneToken[];
  config: LayoutConfig;
}

const ZONE_FILLS: Record<string, { fill: string; opacity: number; pattern?: string }> = {
  core:     { fill: '#C8E6C9', opacity: 0.85 },   // Marketplace — pastel green
  middle:   { fill: '#FFF9C4', opacity: 0.75 },   // Quarters — warm pastel yellow
  outer:    { fill: '#FFCDD2', opacity: 0.65 },   // Periphery — muted pink-red
  inactive: { fill: '#E8F5E9', opacity: 0.3 },    // Meadow — soft green
};

export function CityZones({ zones, config }: CityZonesProps) {
  return (
    <g className="city-zones">
      {/* Meadow gradient beyond boundary */}
      <defs>
        <radialGradient id="meadow-grad" cx="50%" cy="50%" r="50%">
          <stop offset="85%" stopColor="#E8F5E9" stopOpacity={0.3} />
          <stop offset="100%" stopColor="#E8F5E9" stopOpacity={0} />
        </radialGradient>
        {/* Subtle grid pattern for marketplace */}
        <pattern id="market-grid" x="0" y="0" width="12" height="12" patternUnits="userSpaceOnUse">
          <path d="M 12 0 L 0 0 0 12" fill="none" stroke="rgba(0,0,0,0.04)" strokeWidth="0.5" />
        </pattern>
        {/* Block pattern for quarters */}
        <pattern id="quarter-blocks" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
          <rect x="1" y="1" width="18" height="18" fill="none" stroke="rgba(0,0,0,0.03)" strokeWidth="0.3" rx="2" />
        </pattern>
      </defs>

      {/* Background meadow circle */}
      <circle
        cx={config.centerX}
        cy={config.centerY}
        r={config.outerRadius * 1.15}
        fill="url(#meadow-grad)"
      />

      {/* Outer dotted boundary */}
      <circle
        cx={config.centerX}
        cy={config.centerY}
        r={config.outerRadius}
        fill="none"
        stroke="rgba(0,0,0,0.15)"
        strokeWidth={1.5}
        strokeDasharray="4 4"
      />

      {/* Zone rings rendered outer-to-inner */}
      {zones.map((z) => {
        const style = ZONE_FILLS[z.zone] || ZONE_FILLS.inactive;
        return (
          <circle
            key={z.zone}
            cx={z.centerX}
            cy={z.centerY}
            r={z.outerRadius}
            fill={style.fill}
            opacity={style.opacity}
          />
        );
      })}

      {/* Overlay patterns */}
      <circle
        cx={config.centerX}
        cy={config.centerY}
        r={config.greenRadius}
        fill="url(#market-grid)"
      />
      <circle
        cx={config.centerX}
        cy={config.centerY}
        r={config.yellowRadius}
        fill="url(#quarter-blocks)"
      />

      {/* Center marker — small fountain/plaza */}
      <circle cx={config.centerX} cy={config.centerY} r={config.greenRadius * 0.12} fill="#A5D6A7" opacity={0.7} />
      <circle cx={config.centerX} cy={config.centerY} r={config.greenRadius * 0.06} fill="#66BB6A" opacity={0.5} />
    </g>
  );
}
