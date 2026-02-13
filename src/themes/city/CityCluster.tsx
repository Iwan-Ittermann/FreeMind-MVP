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
}

const CLUSTER_BG_COLORS = [
  'rgba(255,214,224,0.18)',
  'rgba(212,231,255,0.18)',
  'rgba(213,245,227,0.18)',
  'rgba(255,243,205,0.18)',
  'rgba(232,213,245,0.18)',
  'rgba(255,229,204,0.18)',
  'rgba(204,242,244,0.18)',
  'rgba(245,213,213,0.18)',
];

export const CityCluster = memo(function CityCluster({ nodes }: CityClusterProps) {
  const fields = useMemo<ClusterField[]>(() => {
    // Group nodes by cluster
    const groups = new Map<number, SemanticNodeToken[]>();
    for (const n of nodes) {
      if (n.clusterId == null || n.zone === 'inactive') continue;
      const arr = groups.get(n.clusterId) ?? [];
      arr.push(n);
      groups.set(n.clusterId, arr);
    }

    const result: ClusterField[] = [];
    for (const [clusterId, members] of groups) {
      if (members.length < 2) continue;
      const xs = members.map(m => m.x);
      const ys = members.map(m => m.y);
      const cx = xs.reduce((a, b) => a + b, 0) / xs.length;
      const cy = ys.reduce((a, b) => a + b, 0) / ys.length;
      const maxDx = Math.max(...xs.map(x => Math.abs(x - cx))) + 20;
      const maxDy = Math.max(...ys.map(y => Math.abs(y - cy))) + 20;
      result.push({
        cx, cy,
        rx: maxDx,
        ry: maxDy,
        fill: CLUSTER_BG_COLORS[Math.abs(clusterId) % CLUSTER_BG_COLORS.length],
      });
    }
    return result;
  }, [nodes]);

  return (
    <g className="city-clusters">
      {fields.map((f, i) => (
        <ellipse
          key={i}
          cx={f.cx} cy={f.cy}
          rx={f.rx} ry={f.ry}
          fill={f.fill}
          className="pointer-events-none"
        />
      ))}
    </g>
  );
});
