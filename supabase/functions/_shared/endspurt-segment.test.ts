import { describe, expect, it } from 'vitest';
import { endspurtSegment, smartTruncate } from './endspurt-segment';

const chats = [{ id: 'c1', a: 'me', b: 'p1' }, { id: 'c2', a: 'p2', b: 'me' }];
const msg = (id: string, chat_id: string, sender_id: string, t: string) =>
  ({ id, chat_id, sender_id, content: id, created_at: `2026-11-14T${t}:00Z` });

describe('endspurt CTA hierarchy', () => {
  it('understanding rating beats an unanswered message', () => {
    const r = endspurtSegment({ userId: 'me', hasOpinion: true, chats, ratedChatIds: new Set(),
      messages: [msg('a', 'c1', 'me', '06:00'), msg('b', 'c1', 'p1', '07:00'), msg('c', 'c2', 'p2', '08:00')] });
    expect(r.segment).toBe('understanding');
    expect(r.chatId).toBe('c1');
    expect(r.unansweredCount).toBe(2);
  });
  it('reply comes second when all two-sided chats are rated', () => {
    const r = endspurtSegment({ userId: 'me', hasOpinion: true, chats, ratedChatIds: new Set(['c1']),
      messages: [msg('a', 'c1', 'me', '06:00'), msg('b', 'c1', 'p1', '07:00'), msg('c', 'c2', 'p2', '08:00')] });
    expect(r.segment).toBe('reply');
    expect(r.chatId).toBe('c2');
  });
  it('start-chat third, opinion last', () => {
    expect(endspurtSegment({ userId: 'me', hasOpinion: true, chats: [], messages: [], ratedChatIds: new Set() }).segment).toBe('start-chat');
    expect(endspurtSegment({ userId: 'me', hasOpinion: false, chats: [], messages: [], ratedChatIds: new Set() }).segment).toBe('opinion');
  });
  it('one-sided own message is not ratable yet', () => {
    const r = endspurtSegment({ userId: 'me', hasOpinion: true, chats, ratedChatIds: new Set(),
      messages: [msg('a', 'c1', 'me', '06:00')] });
    expect(r.segment).toBe('start-chat');
  });
});

describe('smartTruncate', () => {
  it('keeps short text and cuts long text at a word boundary', () => {
    expect(smartTruncate('Kurz.', 200)).toBe('Kurz.');
    const out = smartTruncate('wort '.repeat(80), 50);
    expect(out.length).toBeLessThanOrEqual(52);
    expect(out.endsWith(' …')).toBe(true);
  });
});
