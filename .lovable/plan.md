

# Fix: Cluster Wedges Not Showing

## Root Cause

The DBSCAN `eps` was reduced from `outerRadius * 0.25` to `outerRadius * 0.10` in Round 3 to get "more granular" clusters. But 0.10 is too small — after collision resolution spreads nodes apart, nearly all nodes end up as noise (cluster = -1). `ClusterWedges` filters out noise nodes, so nothing renders.

## Fix

In `src/lib/freemind-layout.ts` line 488:
- Change `eps` from `0.10` to `0.18` — a middle ground that produces more clusters than the original `0.25` (which gave only 2) but doesn't collapse everything to noise like `0.10`.
- This balances granularity with cluster formation. With a typical `outerRadius` of ~280px, `eps = ~50px` gives a reasonable neighborhood radius after collision resolution.

**Single line change**, no other files affected.

