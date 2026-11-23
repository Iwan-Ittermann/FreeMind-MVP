import { describe, it, expect } from 'vitest';
import { OPINION_DIFFERENCE_STEPS, opinionDifferenceIndex } from './opinion-difference';

describe('opinion stance steps', () => {
  it('keeps the five stored values 0/2/5/8/10', () => {
    expect(OPINION_DIFFERENCE_STEPS.map((s) => s.value)).toEqual([0, 2, 5, 8, 10]);
  });
  it('maps saved values back to their step', () => {
    expect([0, 2, 5, 8, 10].map(opinionDifferenceIndex)).toEqual([0, 1, 2, 3, 4]);
  });
});
