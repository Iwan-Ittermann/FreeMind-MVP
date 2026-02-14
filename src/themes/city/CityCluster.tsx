import { useMemo, memo } from 'react';
import { SemanticNodeToken } from '../types';

interface CityClusterProps {
  nodes: readonly SemanticNodeToken[];
}

interface ClusterField {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  fill: string;
  strokeColor: string;
  avgZone: string;
}

// Zone-themed cluster colors
function getClusterColor(avgZone: string, index: number): { fill: string; stroke: string } {
  if (avgZone === 'core' || avgZone === 'middle') {
    const greens = [
      { fill: 'hsla(130, 45%, 40%, 0.18)', stroke: 'hsla(130, 45%, 40%, 0.3)' },
      { fill: 'hsla(150, 40%, 38%, 0.18)', stroke: 'hsla(150, 40%, 38%, 0.3)' },
      { fill: 'hsla(110, 35%, 42%, 0.18)', stroke: 'hsla(110, 35%, 42%, 0.3)' },
      { fill: 'hsla(140, 50%, 35%, 0.18)', stroke: 'hsla(140, 50%, 35%, 0.3)' },
    ];
    return greens[index % greens.length];
  }
  // outer / inactive → warm sandy
  const warms = [
    { fill: 'hsla(35, 45%, 55%, 0.18)', stroke: 'hsla(35, 45%, 55%, 0.3)' },
    { fill: 'hsla(25, 40%, 50%, 0.18)', stroke: 'hsla(25, 40%, 50%, 0.3)' },
    { fill: 'hsla(45, 35%, 58%, 0.18)', stroke: 'hsla(45, 35%, 58%, 0.3)' },
    { fill: 'hsla(30, 50%, 52%, 0.18)', stroke: 'hsla(30, 50%, 52%, 0.3)' },
  ];
  return warms[index % warms.length];
}

export const CityCluster = memo(function CityCluster({ nodes }: CityClusterProps) {
  const fields = useMemo<ClusterField[]>(() => {
    const groups = new Map<number, SemanticNodeToken[]>();
    for (const n of nodes) {
      if (n.clusterId == null || n.zone === 'inactive') continue;
      const arr = groups.get(n.clusterId) ?? [];
      arr.push(n);
      groups.set(n.clusterId, arr);
    }

    const result: ClusterField[] = [];
    let idx = 0;
    for (const [, members] of groups) {
      if (members.length < 2) continue;
      const xs = members.map(m => m.x);
      const ys = members.map(m => m.y);
      const cx = xs.reduce((a, b) => a + b, 0) / xs.length;
      const cy = ys.reduce((a, b) => a + b, 0) / ys.length;
      const maxDx = Math.max(...xs.map(x => Math.abs(x - cx))) + 20;
      const maxDy = Math.max(...ys.map(y => Math.abs(y - cy))) + 20;

      // Determine dominant zone of cluster
      const zoneCounts: Record<string, number> = {};
      for (const m of members) {
        zoneCounts[m.zone] = (zoneCounts[m.zone] || 0) + 1;
      }
      const avgZone = Object.entries(zoneCounts).sort((a, b) => b[1] - a[1])[0][0];

      const colors = getClusterColor(avgZone, idx);
      result.push({
        cx, cy, rx: maxDx, ry: maxDy,
        fill: colors.fill,
        strokeColor: colors.stroke,
        avgZone,
      });
      idx++;
    }
    return result;
  }, [nodes]);

  return (
    <g className="city-clusters">
      {fields.map((f, i) => (
        <g key={i}>
          <ellipse
            cx={f.cx} cy={f.cy} rx={f.rx} ry={f.ry}
            fill={f.fill}
            className="pointer-events-none"
          />
          <ellipse
            cx={f.cx} cy={f.cy} rx={f.rx} ry={f.ry}
            fill="none"
            stroke={f.strokeColor}
            strokeWidth={0.8}
            strokeDasharray="4 3"
            className="pointer-events-none"
          />
        </g>
      ))}
    </g>
  );
});
