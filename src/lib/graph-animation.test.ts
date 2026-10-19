import { describe, expect, it } from 'vitest';
import { bridgePointTone, chatRespectTone, graphActivityFields, GRAPH_ANIMATION, scheduleOpinionReaction, messageBubblePosition } from './graph-animation';
import { opinionDifferenceIndex } from './opinion-difference';

describe('directed arrow point scale', () => {
  it('shows high bridge scores on the RPC 0–100 scale as positive', () => {
    expect(bridgePointTone(9 * 8)).toBe('high');
    expect(bridgePointTone(10 * 10)).toBe('high');
    expect(bridgePointTone(65)).toBe('high');
  });
  it('retains low, middle and unrated scores', () => {
    expect(bridgePointTone(29)).toBe('low');
    expect(bridgePointTone(30)).toBe('neutral');
    expect(bridgePointTone(64)).toBe('neutral');
    expect(bridgePointTone(null)).toBe('unrated');
  });
});

describe('chat arrow respect scale', () => {
  it('is red through 30 respect points', () => {
    expect(chatRespectTone(0)).toBe('low');
    expect(chatRespectTone(30)).toBe('low');
  });
  it('is yellow through 50 and the gap up to 55', () => {
    expect(chatRespectTone(31)).toBe('neutral');
    expect(chatRespectTone(50)).toBe('neutral');
    expect(chatRespectTone(55)).toBe('neutral');
  });
  it('is green only above 55', () => {
    expect(chatRespectTone(55.1)).toBe('high');
    expect(chatRespectTone(100)).toBe('high');
  });
  it('does not color missing respect as a negative rating', () => {
    expect(chatRespectTone(null)).toBe('unrated');
  });
});

describe('independent opinion reactions', () => {
  it('preserves agreement zero without requiring respect or a chat', () => {
    const result = graphActivityFields({ type: 'difference_rating', disagreement: 0 });
    expect(result.kind).toBe('difference_rating');
    expect(result.disagreement).toBe(0);
    expect(result.respect).toBeUndefined();
    expect(result.activatesChat).toBe(false);
    expect(result.durationMs).toBe(GRAPH_ANIMATION.differenceRatingMs);
  });
  it('preserves disagreement ten independently from chat respect', () => {
    expect(graphActivityFields({ type: 'difference_rating', disagreement: 10 }).disagreement).toBe(10);
    const respect = graphActivityFields({ type: 'rating', respect: 80 });
    expect(respect.kind).toBe('rating');
    expect(respect.respect).toBe(80);
    expect(respect.activatesChat).toBe(true);
  });
});

describe('sequential opinion reactions', () => {
  it.each([3, 4, 5])('keeps all %i ratings in a giver batch sequential', count => {
    const ends = new Map<string, number>();
    const lanes = [0, 0, 0, 0];
    const starts = Array.from({ length: count }, () => scheduleOpinionReaction('rater', 1000, ends, lanes));
    expect(starts).toHaveLength(count);
    expect(starts[0]).toBe(1000);
    for (let i = 1; i < starts.length; i++) expect(starts[i] - starts[i - 1]).toBe(1980);
  });
  it('limits concurrent reactions without discarding additional givers', () => {
    const ends = new Map<string, number>();
    const lanes = [0, 0, 0, 0];
    const starts = Array.from({ length: 5 }, (_, i) => scheduleOpinionReaction(String(i), 1000, ends, lanes));
    expect(starts).toEqual([1000, 1000, 1000, 1000, 2980]);
  });
});

describe('flight bounds', () => {
  it.each([240, 360, 480])('contains the full message throughout a %i pixel graph flight', width => {
    const from = messageBubblePosition(-20, -20, width, width);
    const to = messageBubblePosition(width + 20, width + 20, width, width);
    for (let i = 0; i <= 20; i++) {
      const x = from.x + (to.x - from.x) * i / 20;
      const y = from.y + (to.y - from.y) * i / 20;
      expect(x - from.maxWidth / 2).toBeGreaterThanOrEqual(4);
      expect(x + from.maxWidth / 2).toBeLessThanOrEqual(width - 4);
      expect(y).toBeGreaterThanOrEqual(4);
      expect(y + 54).toBeLessThanOrEqual(width - 4);
    }
  });
});

describe('shared five-step opinion values', () => {
  it.each([[0, 0], [2, 1], [5, 2], [8, 3], [10, 4]])('maps difference %i to step %i', (value, index) => {
    expect(opinionDifferenceIndex(value)).toBe(index);
  });
});