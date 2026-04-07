import { useMemo } from 'react';
import { GraphNode, LayoutConfig } from '@/types/graph';

interface ClusterWedgesProps {
  nodes: GraphNode[];
  config: LayoutConfig;
}

// Cluster colors — translucent, zone-themed
const CLUSTER_COLORS = [
  'hsla(120, 40%, 50%, 0.08)',  // green-tinted
  'hsla(200, 50%, 50%, 0.08)',  // blue-tinted
  'hsla(280, 40%, 50%, 0.08)',  // purple-tinted
  'hsla(30, 50%, 50%, 0.08)',   // sandy/warm
  'hsla(340, 40%, 50%, 0.08)',  // pink-tinted
  'hsla(60, 50%, 50%, 0.08)',   // yellow-tinted
  'hsla(160, 40%, 50%, 0.08)',  // teal-tinted
  'hsla(10, 50%, 50%, 0.08)',   // red-orange
];

const CLUSTER_STROKE_COLORS = [
  'hsla(120, 40%, 50%, 0.15)',
  'hsla(200, 50%, 50%, 0.15)',
  'hsla(280, 40%, 50%, 0.15)',
  'hsla(30, 50%, 50%, 0.15)',
  'hsla(340, 40%, 50%, 0.15)',
  'hsla(60, 50%, 50%, 0.15)',
  'hsla(160, 40%, 50%, 0.15)',
  'hsla(10, 50%, 50%, 0.15)',
];

function polarAngle(node: GraphNode, config: LayoutConfig): number {
  return Math.atan2(node.y - config.centerY, node.x - config.centerX);
}

function polarRadius(node: GraphNode, config: LayoutConfig): number {
  const dx = node.x - config.centerX;
  const dy = node.y - config.centerY;
  return Math.sqrt(dx * dx + dy * dy);
}

export function ClusterWedges({ nodes, config }: ClusterWedgesProps) {
  const wedges = useMemo(() => {
    // Group nodes by cluster
    const clusterMap = new Map<number, GraphNode[]>();
    for (const node of nodes) {
      if (node.cluster == null || node.cluster < 0) continue;
      if (!clusterMap.has(node.cluster)) clusterMap.set(node.cluster, []);
      clusterMap.get(node.cluster)!.push(node);
    }

    const result: Array<{
      id: number;
      path: string;
      fill: string;
      stroke: string;
    }> = [];

    for (const [clusterId, clusterNodes] of clusterMap) {
      if (clusterNodes.length < 2) continue;

      const angles = clusterNodes.map(n => polarAngle(n, config));
      const radii = clusterNodes.map(n => polarRadius(n, config));

      // Find angular extent — handle wrap-around
      const sortedAngles = [...angles].sort((a, b) => a - b);
      
      // Check if the cluster wraps around ±π
      let minAngle = sortedAngles[0];
      let maxAngle = sortedAngles[sortedAngles.length - 1];
      let angularSpan = maxAngle - minAngle;
      
      // If span > π, the cluster likely wraps around, find the largest gap
      if (angularSpan > Math.PI) {
        let largestGap = 0;
        let gapEndIdx = 0;
        for (let i = 0; i < sortedAngles.length; i++) {
          const next = (i + 1) % sortedAngles.length;
          let gap = sortedAngles[next] - sortedAngles[i];
          if (gap <= 0) gap += 2 * Math.PI;
          if (gap > largestGap) {
            largestGap = gap;
            gapEndIdx = next;
          }
        }
        minAngle = sortedAngles[gapEndIdx];
        maxAngle = sortedAngles[(gapEndIdx + sortedAngles.length - 1) % sortedAngles.length];
        if (maxAngle < minAngle) maxAngle += 2 * Math.PI;
      }

      const padding = 0.15; // radians
      const startAngle = minAngle - padding;
      const endAngle = maxAngle + padding;
      
      const minRadius = Math.max(0, Math.min(...radii) - 20);
      const maxRadius = Math.max(...radii) + 20;

      // Build SVG arc path (annular sector / wedge)
      const innerR = minRadius;
      const outerR = maxRadius;

      const x1 = config.centerX + Math.cos(startAngle) * outerR;
      const y1 = config.centerY + Math.sin(startAngle) * outerR;
      const x2 = config.centerX + Math.cos(endAngle) * outerR;
      const y2 = config.centerY + Math.sin(endAngle) * outerR;
      const x3 = config.centerX + Math.cos(endAngle) * innerR;
      const y3 = config.centerY + Math.sin(endAngle) * innerR;
      const x4 = config.centerX + Math.cos(startAngle) * innerR;
      const y4 = config.centerY + Math.sin(startAngle) * innerR;

      let sweep = endAngle - startAngle;
      if (sweep < 0) sweep += 2 * Math.PI;
      const largeArc = sweep > Math.PI ? 1 : 0;

      const path = [
        `M ${x1} ${y1}`,
        `A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2} ${y2}`,
        `L ${x3} ${y3}`,
        `A ${innerR} ${innerR} 0 ${largeArc} 0 ${x4} ${y4}`,
        'Z',
      ].join(' ');

      result.push({
        id: clusterId,
        path,
        fill: CLUSTER_COLORS[clusterId % CLUSTER_COLORS.length],
        stroke: CLUSTER_STROKE_COLORS[clusterId % CLUSTER_STROKE_COLORS.length],
      });
    }

    return result;
  }, [nodes, config]);

  if (wedges.length === 0) return null;

  return (
    <g className="cluster-wedges">
      {wedges.map(w => (
        <path
          key={w.id}
          d={w.path}
          fill={w.fill}
          stroke={w.stroke}
          strokeWidth={1}
          strokeDasharray="4 3"
        />
      ))}
    </g>
  );
}
