import { describe, expect, it } from 'vitest';
import { bridgePointTone, chatRespectTone, graphActivityFields, GRAPH_ANIMATION } from './graph-animation';

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
    expect(result.durationMs).toBe(GRAPH_ANIMATION.ratingMs);
  });
  it('preserves disagreement ten independently from chat respect', () => {
    expect(graphActivityFields({ type: 'difference_rating', disagreement: 10 }).disagreement).toBe(10);
    const respect = graphActivityFields({ type: 'rating', respect: 80 });
    expect(respect.kind).toBe('rating');
    expect(respect.respect).toBe(80);
    expect(respect.activatesChat).toBe(true);
  });
});