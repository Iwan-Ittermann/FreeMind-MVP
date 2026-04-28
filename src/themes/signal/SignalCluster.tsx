import { memo, useMemo } from 'react';
import { SemanticNodeToken } from '../types';
import { getClusterColor } from '@/lib/cluster-colors';

interface SignalClusterProps {
  nodes: readonly SemanticNodeToken[];
}

interface ClusterField {
  id: number;
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  color: string;
}

export const SignalCluster = memo(function SignalCluster({ nodes }: SignalClusterProps) {
  const fields = useMemo<ClusterField[]>(() => {
    const groups = new Map<number, SemanticNodeToken[]>();
    for (const node of nodes) {
      if (node.clusterId == null || node.isHidden) continue;
      const members = groups.get(node.clusterId) ?? [];
      members.push(node);
      groups.set(node.clusterId, members);
    }

    return [...groups.entries()]
      .sort((a, b) => a[0] - b[0])
      .flatMap(([id, members]) => {
        if (members.length < 2) return [];
        const xs = members.map(m => m.x);
        const ys = members.map(m => m.y);
        const cx = xs.reduce((sum, value) => sum + value, 0) / xs.length;
        const cy = ys.reduce((sum, value) => sum + value, 0) / ys.length;
        const rx = Math.max(42, Math.max(...xs.map(x => Math.abs(x - cx))) + 34);
        const ry = Math.max(42, Math.max(...ys.map(y => Math.abs(y - cy))) + 34);
        return [{ id, cx, cy, rx, ry, color: members[0].clusterColor ?? getClusterColor(id) ?? 'hsl(var(--primary))' }];
      });
  }, [nodes]);

  if (fields.length === 0) return null;

  return (
    <g className="signal-clusters" pointerEvents="none">
      <defs>
        <filter id="signal-cluster-soft-edge" x="-35%" y="-35%" width="170%" height="170%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
      </defs>
      {fields.map(field => (
        <g key={field.id}>
          <ellipse
            cx={field.cx}
            cy={field.cy}
            rx={field.rx}
            ry={field.ry}
            fill={field.color}
            fillOpacity={0.12}
            filter="url(#signal-cluster-soft-edge)"
          />
          <ellipse
            cx={field.cx}
            cy={field.cy}
            rx={field.rx}
            ry={field.ry}
            fill="none"
            stroke={field.color}
            strokeOpacity={0.22}
            strokeWidth={1}
          />
        </g>
      ))}
    </g>
  );
});
