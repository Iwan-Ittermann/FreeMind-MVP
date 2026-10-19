import { describe, expect, it } from 'vitest';
import { shouldSendOnEnter } from './chat-enter';

const enter = { key: 'Enter', shiftKey: false, isComposing: false, isMobile: true, simulation: true };
describe('simulation chat Enter', () => {
  it('sends on Enter even in the mobile layout', () => {
    expect(shouldSendOnEnter(enter)).toBe(true);
  });
  it('keeps Shift+Enter for newlines', () => {
    expect(shouldSendOnEnter({ ...enter, shiftKey: true })).toBe(false);
  });
  it('does not send while an input method is composing', () => {
    expect(shouldSendOnEnter({ ...enter, isComposing: true })).toBe(false);
  });
  it('preserves mobile Enter behavior outside simulations', () => {
    expect(shouldSendOnEnter({ ...enter, simulation: false })).toBe(false);
  });
});