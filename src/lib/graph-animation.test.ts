import { describe, expect, it } from 'vitest';
import { bridgePointTone } from './graph-animation';

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