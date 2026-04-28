import { ChatRating, Opinion } from '@/types/graph';

const MAX_CLUSTERS = 6;
const MIN_CLUSTERABLE_NODES = 3;
const EPSILON = 1e-9;

function identity(size: number): number[][] {
  return Array.from({ length: size }, (_, i) =>
    Array.from({ length: size }, (_, j) => (i === j ? 1 : 0)),
  );
}

function jacobiEigenSymmetric(input: number[][]): { values: number[]; vectors: number[][] } {
  const n = input.length;
  const a = input.map(row => [...row]);
  const v = identity(n);
  const maxIterations = Math.max(50, n * n * 20);

  for (let iter = 0; iter < maxIterations; iter++) {
    let p = 0;
    let q = 1;
    let max = 0;

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const value = Math.abs(a[i][j]);
        if (value > max) {
          max = value;
          p = i;
          q = j;
        }
      }
    }

    if (max < 1e-8) break;

    const app = a[p][p];
    const aqq = a[q][q];
    const apq = a[p][q];
    const phi = 0.5 * Math.atan2(2 * apq, aqq - app);
    const c = Math.cos(phi);
    const s = Math.sin(phi);

    for (let i = 0; i < n; i++) {
      if (i !== p && i !== q) {
        const aip = a[i][p];
        const aiq = a[i][q];
        a[i][p] = c * aip - s * aiq;
        a[p][i] = a[i][p];
        a[i][q] = s * aip + c * aiq;
        a[q][i] = a[i][q];
      }
    }

    a[p][p] = c * c * app - 2 * s * c * apq + s * s * aqq;
    a[q][q] = s * s * app + 2 * s * c * apq + c * c * aqq;
    a[p][q] = 0;
    a[q][p] = 0;

    for (let i = 0; i < n; i++) {
      const vip = v[i][p];
      const viq = v[i][q];
      v[i][p] = c * vip - s * viq;
      v[i][q] = s * vip + c * viq;
    }
  }

  const ordered = Array.from({ length: n }, (_, i) => ({
    value: a[i][i],
    vector: v.map(row => row[i]),
  })).sort((x, y) => x.value - y.value);

  return {
    values: ordered.map(item => item.value),
    vectors: ordered.map(item => item.vector),
  };
}

function squaredDistance(a: number[], b: number[]): number {
  let total = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    total += d * d;
  }
  return total;
}

function normalizeRows(rows: number[][]): number[][] {
  return rows.map(row => {
    const norm = Math.sqrt(row.reduce((sum, value) => sum + value * value, 0));
    return norm > EPSILON ? row.map(value => value / norm) : row.map(() => 0);
  });
}

function kMeansDeterministic(points: number[][], k: number): number[] {
  const n = points.length;
  const centroids: number[][] = [points[0]];

  while (centroids.length < k) {
    let bestIndex = 0;
    let bestDistance = -1;
    for (let i = 0; i < n; i++) {
      const nearest = Math.min(...centroids.map(c => squaredDistance(points[i], c)));
      if (nearest > bestDistance + EPSILON) {
        bestDistance = nearest;
        bestIndex = i;
      }
    }
    centroids.push([...points[bestIndex]]);
  }

  let assignments = new Array(n).fill(0);
  for (let iter = 0; iter < 40; iter++) {
    let changed = false;
    assignments = points.map((point, i) => {
      let best = assignments[i] ?? 0;
      let bestDist = Number.POSITIVE_INFINITY;
      for (let c = 0; c < centroids.length; c++) {
        const dist = squaredDistance(point, centroids[c]);
        if (dist < bestDist - EPSILON) {
          bestDist = dist;
          best = c;
        }
      }
      if (best !== assignments[i]) changed = true;
      return best;
    });

    const nextCentroids = Array.from({ length: k }, () => Array(points[0].length).fill(0));
    const counts = Array(k).fill(0);
    for (let i = 0; i < n; i++) {
      counts[assignments[i]] += 1;
      for (let d = 0; d < points[i].length; d++) nextCentroids[assignments[i]][d] += points[i][d];
    }

    for (let c = 0; c < k; c++) {
      if (counts[c] === 0) continue;
      for (let d = 0; d < nextCentroids[c].length; d++) nextCentroids[c][d] /= counts[c];
      centroids[c] = nextCentroids[c];
    }

    if (!changed) break;
  }

  return assignments;
}

function compactClusterIds(assignments: number[], ids: string[]): Map<string, number> {
  const firstIdByCluster = new Map<number, string>();
  assignments.forEach((cluster, index) => {
    const current = firstIdByCluster.get(cluster);
    if (!current || ids[index] < current) firstIdByCluster.set(cluster, ids[index]);
  });

  const orderedClusters = [...firstIdByCluster.entries()]
    .sort((a, b) => a[1].localeCompare(b[1]))
    .map(([cluster]) => cluster);
  const compact = new Map(orderedClusters.map((cluster, index) => [cluster, index]));

  return new Map(ids.map((id, index) => [id, compact.get(assignments[index]) ?? 0]));
}

export function detectDisagreementClusters(opinions: Opinion[], ratings: ChatRating[]): Map<string, number> {
  const ids = [...opinions].map(op => op.id).sort();
  const n = ids.length;
  if (n < MIN_CLUSTERABLE_NODES) return new Map();

  const indexById = new Map(ids.map((id, index) => [id, index]));
  const disagreement = Array.from({ length: n }, () => Array<number | null>(n).fill(null));
  const connected = new Set<string>();

  for (const rating of ratings) {
    const a = indexById.get(rating.opinionA);
    const b = indexById.get(rating.opinionB);
    if (a == null || b == null || a === b) continue;
    const value = Math.max(0, Math.min(100, Number(rating.disagreement) || 0));
    disagreement[a][b] = value;
    disagreement[b][a] = value;
    connected.add(ids[a]);
    connected.add(ids[b]);
  }

  if (connected.size < MIN_CLUSTERABLE_NODES) return new Map();

  const affinity = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    affinity[i][i] = 1;
    for (let j = i + 1; j < n; j++) {
      const direct = disagreement[i][j];
      let similarity = direct == null ? 0 : Math.exp(-Math.pow(direct / 38, 2));

      const profileDiffs: number[] = [];
      for (let k = 0; k < n; k++) {
        if (k === i || k === j) continue;
        const ai = disagreement[i][k];
        const bj = disagreement[j][k];
        if (ai != null && bj != null) profileDiffs.push(Math.abs(ai - bj));
      }
      if (profileDiffs.length >= 2) {
        const avgDiff = profileDiffs.reduce((sum, value) => sum + value, 0) / profileDiffs.length;
        similarity = Math.max(similarity, Math.exp(-Math.pow(avgDiff / 32, 2)) * 0.85);
      }

      if (similarity < 0.08) similarity = 0;
      affinity[i][j] = similarity;
      affinity[j][i] = similarity;
    }
  }

  const degree = affinity.map(row => row.reduce((sum, value) => sum + value, 0));
  const laplacian = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => {
      if (i === j) return 1;
      const denom = Math.sqrt(Math.max(degree[i], EPSILON) * Math.max(degree[j], EPSILON));
      return -affinity[i][j] / denom;
    }),
  );

  const { values, vectors } = jacobiEigenSymmetric(laplacian);
  const maxK = Math.min(MAX_CLUSTERS, n - 1);
  let bestK = 1;
  let bestGap = 0;
  for (let k = 1; k <= maxK; k++) {
    const gap = values[k] - values[k - 1];
    if (gap > bestGap + EPSILON) {
      bestGap = gap;
      bestK = k;
    }
  }

  if (bestK < 2 || bestGap < 0.035) return new Map();

  const embedding = normalizeRows(
    Array.from({ length: n }, (_, row) =>
      Array.from({ length: bestK }, (_, col) => vectors[col][row]),
    ),
  );
  const assignments = kMeansDeterministic(embedding, bestK);
  const counts = assignments.reduce((map, cluster) => map.set(cluster, (map.get(cluster) ?? 0) + 1), new Map<number, number>());
  if ([...counts.values()].filter(count => count >= 2).length < 2) return new Map();

  return compactClusterIds(assignments, ids);
}
