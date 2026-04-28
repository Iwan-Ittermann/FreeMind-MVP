const CLUSTER_COLORS = [
  'hsl(188 92% 52%)',
  'hsl(142 72% 45%)',
  'hsl(46 92% 56%)',
  'hsl(338 82% 62%)',
  'hsl(262 80% 68%)',
  'hsl(24 88% 58%)',
] as const;

export function getClusterColor(clusterId: number | null | undefined): string | null {
  if (clusterId == null || clusterId < 0) return null;
  return CLUSTER_COLORS[clusterId % CLUSTER_COLORS.length];
}
