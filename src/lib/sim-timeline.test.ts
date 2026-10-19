import { describe, expect, it } from 'vitest';
import social from '@/data/sim-timeline.json';

describe('independent AI opinion ratings', () => {
  const ratings = social.timeline.filter(event => event.type === 'difference_rating');
  it('has substantially more opinion ratings than chats for every node', () => {
    expect(ratings).toHaveLength(571);
    expect(social.chats).toHaveLength(26);
    for (const persona of social.personas) {
      const given = ratings.filter(event => event.from_slot === persona.slot).length;
      const chats = social.chats.filter(chat => chat.a === persona.slot || chat.b === persona.slot).length;
      expect(given).toBeGreaterThan(chats * 2);
    }
  });
  it('rates opinions independently, including before chats and between non-chat pairs', () => {
    const firstChat = social.timeline.find(event => event.type === 'chat_open');
    expect(firstChat).toBeDefined();
    expect(ratings.filter(event => event.t < (firstChat?.t ?? 0)).length).toBeGreaterThan(0);
    const chatPairs = new Set(social.chats.map(chat => [chat.a, chat.b].sort((a, b) => a - b).join('|')));
    expect(ratings.filter(event => !chatPairs.has([event.from_slot, event.to_slot].sort((a, b) => Number(a) - Number(b)).join('|'))).length).toBeGreaterThan(ratings.length / 2);
  });
});