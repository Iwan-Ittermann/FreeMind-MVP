/**
 * Stream-Spirale — deterministische Auswahlmechanik für den Stream-Tab.
 *
 * Eine archimedische Spirale liegt über dem Graphen (Einheitsraum: Zentrum 0,0,
 * blauer Ring = 300). Pro Umlauf gibt es genau einen Spiralpunkt pro
 * Kandidaten-Node. Alle X Minuten (Takt) springt der „heiße" Punkt weiter.
 * Welcher Punkt dran ist, ergibt sich rein aus Uhrzeit + Startzeitpunkt;
 * welcher Node ihm am nächsten liegt, wird live aus den aktuellen Positionen
 * ausgewertet — ohne Wiederholung pro Umlauf. Vergangene Einträge werden
 * extern festgeschrieben (app_settings) und hier nur als `pinned` übergeben.
 */

export interface SpiralCandidate {
  id: string;
  x: number;
  y: number;
}

export interface SpiralPoint {
  index: number;
  x: number;
  y: number;
}

export interface StreamEntry {
  index: number;
  nodeId: string;
  point: SpiralPoint;
  /** true = vergangener, festgeschriebener Eintrag; false = live ausgewertet */
  pinned: boolean;
}

/** Goldener Winkel in Radiant — Startwinkel-Rotation pro Umlauf. */
export const GOLDEN_ANGLE = 2.399963229728653;

/** Äußerster Radius der Spirale im Einheitsraum (Ring „0 Punkte"). */
export const SPIRAL_MAX_R = 300;

/** Windungen in Abhängigkeit von der Kandidatenanzahl. */
export function computeTurns(n: number): number {
  if (n <= 1) return 1;
  return Math.max(1, Math.ceil(Math.sqrt(n) / 2));
}

/** Taktlänge in ms: Umlaufdauer / N, geklemmt auf 5–120 Minuten. */
export function computeTickMs(cycleMs: number, n: number): number {
  const MIN = 5 * 60 * 1000;
  const MAX = 120 * 60 * 1000;
  if (n <= 0) return MIN;
  return Math.min(MAX, Math.max(MIN, cycleMs / n));
}

/** Position des Spiralpunkts i (0..N-1) im Einheitsraum. */
export function spiralPoint(index: number, n: number, turns: number, rotation: number): SpiralPoint {
  const frac = (index + 0.5) / Math.max(n, 1);
  const r = frac * SPIRAL_MAX_R;
  const angle = rotation + 2 * Math.PI * turns * frac;
  return { index, x: Math.cos(angle) * r, y: Math.sin(angle) * r };
}

/** Alle Spiralpunkte eines Umlaufs. */
export function spiralPoints(n: number, cycle: number): SpiralPoint[] {
  const turns = computeTurns(n);
  const rotation = cycle * GOLDEN_ANGLE;
  const out: SpiralPoint[] = [];
  for (let i = 0; i < n; i++) out.push(spiralPoint(i, n, turns, rotation));
  return out;
}

export interface StreamClock {
  cycle: number;
  index: number;
  globalTick: number;
  tickMs: number;
  /** ms bis zum nächsten Punkt. */
  countdownMs: number;
}

/** Welcher Punkt gerade dran ist — rein aus Uhrzeit und Startzeitpunkt. */
export function streamClock(nowMs: number, startedAtMs: number, cycleMs: number, n: number): StreamClock {
  const tickMs = computeTickMs(cycleMs, n);
  const elapsed = Math.max(0, nowMs - startedAtMs);
  const globalTick = Math.floor(elapsed / tickMs);
  const cycle = n > 0 ? Math.floor(globalTick / n) : 0;
  const index = n > 0 ? globalTick % n : 0;
  const countdownMs = tickMs - (elapsed % tickMs);
  return { cycle, index, globalTick, tickMs, countdownMs };
}

/**
 * Zuordnung Spiralpunkt → Node für einen Umlauf.
 * `pinned` bildet Punkt-Index auf die festgeschriebene Node-ID ab (Vergangenheit).
 * Für nicht festgeschriebene Punkte wird der nächstgelegene noch nicht
 * verwendete Kandidat gewählt (live). Gleichstand: kleinere ID gewinnt.
 */
export function assignStream(
  candidates: SpiralCandidate[],
  n: number,
  cycle: number,
  pinned: ReadonlyMap<number, string>,
): StreamEntry[] {
  const points = spiralPoints(n, cycle);
  const byId = new Map(candidates.map((c) => [c.id, c]));
  const used = new Set<string>();
  const entries: StreamEntry[] = [];

  for (const p of points) {
    const pinnedId = pinned.get(p.index);
    if (pinnedId && byId.has(pinnedId) && !used.has(pinnedId)) {
      used.add(pinnedId);
      entries.push({ index: p.index, nodeId: pinnedId, point: p, pinned: true });
      continue;
    }
    let best: SpiralCandidate | null = null;
    let bestDist = Number.POSITIVE_INFINITY;
    for (const c of candidates) {
      if (used.has(c.id)) continue;
      const dx = c.x - p.x;
      const dy = c.y - p.y;
      const d = dx * dx + dy * dy;
      if (d < bestDist - 1e-9 || (Math.abs(d - bestDist) <= 1e-9 && best && c.id < best.id)) {
        best = c;
        bestDist = d;
      }
    }
    if (best) {
      used.add(best.id);
      entries.push({ index: p.index, nodeId: best.id, point: p, pinned: false });
    }
  }
  return entries;
}
