import { useMemo, memo } from 'react';
import { SemanticNodeToken } from '../types';

interface ArcaneClusterProps {
  nodes: readonly SemanticNodeToken[];
}

function getClusterColor(avgZone: string, index: number): { fill: string; stroke: string } {
  if (avgZone === 'core' || avgZone === 'middle') {
    const colors = [
      { fill: 'hsla(50, 40%, 40%, 0.15)', stroke: 'hsla(50, 40%, 40%, 0.25)' },
      { fill: 'hsla(65, 30%, 38%, 0.15)', stroke: 'hsla(65, 30%, 38%, 0.25)' },
      { fill: 'hsla(45, 35%, 42%, 0.15)', stroke: 'hsla(45, 35%, 42%, 0.25)' },
      { fill: 'hsla(55, 45%, 35%, 0.15)', stroke: 'hsla(55, 45%, 35%, 0.25)' },
    ];
    return colors[index % colors.length];
  }
  const colors = [
    { fill: 'hsla(40, 25%, 40%, 0.15)', stroke: 'hsla(40, 25%, 40%, 0.25)' },
    { fill: 'hsla(35, 20%, 38%, 0.15)', stroke: 'hsla(35, 20%, 38%, 0.25)' },
    { fill: 'hsla(50, 18%, 42%, 0.15)', stroke: 'hsla(50, 18%, 42%, 0.25)' },
  ];
  return colors[index % colors.length];
}

export const ArcaneCluster = memo(function ArcaneCluster({ nodes }: ArcaneClusterProps) {
  const fields = useMemo(() => {
    const groups = new Map<number, SemanticNodeToken[]>();
    for (const n of nodes) {
      if (n.clusterId == null || n.zone === 'inactive') continue;
      const arr = groups.get(n.clusterId) ?? [];
      arr.push(n);
      groups.set(n.clusterId, arr);
    }

    const result: { cx: number; cy: number; rx: number; ry: number; fill: string; stroke: string }[] = [];
    let idx = 0;
    for (const [, members] of groups) {
      if (members.length < 2) continue;
      const xs = members.map(m => m.x);
      const ys = members.map(m => m.y);
      const cx = xs.reduce((a, b) => a + b, 0) / xs.length;
      const cy = ys.reduce((a, b) => a + b, 0) / ys.length;
      const maxDx = Math.max(...xs.map(x => Math.abs(x - cx))) + 20;
      const maxDy = Math.max(...ys.map(y => Math.abs(y - cy))) + 20;
      const zoneCounts: Record<string, number> = {};
      for (const m of members) zoneCounts[m.zone] = (zoneCounts[m.zone] || 0) + 1;
      const avgZone = Object.entries(zoneCounts).sort((a, b) => b[1] - a[1])[0][0];
      const colors = getClusterColor(avgZone, idx);
      result.push({ cx, cy, rx: maxDx, ry: maxDy, ...colors });
      idx++;
    }
    return result;
  }, [nodes]);

  return (
    <g className="arcane-clusters">
      {fields.map((f, i) => (
        <g key={i}>
          <ellipse cx={f.cx} cy={f.cy} rx={f.rx} ry={f.ry} fill={f.fill} className="pointer-events-none" />
          <ellipse cx={f.cx} cy={f.cy} rx={f.rx} ry={f.ry} fill="none" stroke={f.stroke} strokeWidth={0.8} strokeDasharray="4 3" className="pointer-events-none" />
        </g>
      ))}
    </g>
  );
});
