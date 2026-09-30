import { describe, expect, it } from 'vitest';
import {
  assignStream,
  computeTickMs,
  computeTurns,
  spiralPoint,
  spiralPoints,
  streamClock,
  SPIRAL_MAX_R,
} from './stream-spiral';

const candidates = (ids: string[]) =>
  ids.map((id, i) => ({ id, x: Math.cos(i) * 100, y: Math.sin(i) * 100 }));

describe('stream-spiral', () => {
  it('computeTurns skaliert mit sqrt(N)/2, mindestens 1', () => {
    expect(computeTurns(0)).toBe(1);
    expect(computeTurns(1)).toBe(1);
    expect(computeTurns(4)).toBe(1);
    expect(computeTurns(9)).toBe(2);
    expect(computeTurns(100)).toBe(5);
  });

  it('computeTickMs klemmt auf 5–120 Minuten', () => {
    const day = 24 * 3600 * 1000;
    expect(computeTickMs(day, 1000)).toBe(5 * 60 * 1000);
    expect(computeTickMs(day, 1)).toBe(120 * 60 * 1000);
    expect(computeTickMs(day, 24)).toBe(3600 * 1000);
  });

  it('Spiralpunkte laufen von innen nach außen, letzter am 0-Punkte-Ring', () => {
    const pts = spiralPoints(10, 0);
    expect(pts).toHaveLength(10);
    const r0 = Math.hypot(pts[0].x, pts[0].y);
    const r9 = Math.hypot(pts[9].x, pts[9].y);
    expect(r0).toBeCloseTo(0.05 * SPIRAL_MAX_R);
    expect(r9).toBeCloseTo(0.95 * SPIRAL_MAX_R);
  });

  it('Rotation pro Umlauf dreht den Startwinkel (Goldener Winkel)', () => {
    const a = spiralPoint(0, 8, 1, 0);
    const b = spiralPoints(8, 1)[0];
    expect(a.x).not.toBeCloseTo(b.x);
  });

  it('streamClock ist deterministisch aus Uhrzeit + Start', () => {
    const start = 1_000_000;
    const day = 24 * 3600 * 1000;
    const c1 = streamClock(start + 3600 * 1000, start, day, 24);
    const c2 = streamClock(start + 3600 * 1000, start, day, 24);
    expect(c1).toEqual(c2);
    expect(c1.index).toBe(1);
    expect(c1.cycle).toBe(0);
    const c3 = streamClock(start + 25 * 3600 * 1000, start, day, 24);
    expect(c3.cycle).toBe(1);
    expect(c3.index).toBe(1);
  });

  it('Zuordnung: gleiche Eingaben → gleiche Auswahl, keine Wiederholung', () => {
    const cands = candidates(['a', 'b', 'c', 'd', 'e']);
    const e1 = assignStream(cands, 5, 0, new Map());
    const e2 = assignStream(cands, 5, 0, new Map());
    expect(e1).toEqual(e2);
    expect(new Set(e1.map((e) => e.nodeId)).size).toBe(5);
  });

  it('Neue Nodes schlagen sofort zu (live-Neuauswertung)', () => {
    const base = candidates(['a', 'b', 'c']);
    const before = assignStream(base, 3, 0, new Map());
    // Neuer Node exakt auf dem ersten Spiralpunkt
    const p0 = spiralPoints(4, 0)[0];
    const withNew = [...base, { id: 'z-neu', x: p0.x, y: p0.y }];
    const after = assignStream(withNew, 4, 0, new Map());
    expect(after[0].nodeId).toBe('z-neu');
    expect(before[0].nodeId).not.toBe('z-neu');
  });

  it('Gepinnte Einträge bleiben unverändert, auch wenn der Graph sich bewegt', () => {
    const cands = candidates(['a', 'b', 'c', 'd']);
    const before = assignStream(cands, 4, 0, new Map());
    const pinnedNode = before[0].nodeId;
    // Graph bewegt sich: alle Positionen ändern sich drastisch
    const moved = cands.map((c) => ({ ...c, x: -c.x * 3, y: -c.y * 2 }));
    const after = assignStream(moved, 4, 0, new Map([[0, pinnedNode]]));
    expect(after[0].nodeId).toBe(pinnedNode);
    expect(after[0].pinned).toBe(true);
  });
});
