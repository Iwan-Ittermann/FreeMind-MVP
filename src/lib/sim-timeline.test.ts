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
  it('always groups a node’s opinion ratings into simultaneous batches of 3–5', () => {
    for (const persona of social.personas) {
      const groups = new Map<number, typeof ratings>();
      for (const rating of ratings.filter(event => event.from_slot === persona.slot)) {
        groups.set(rating.t, [...(groups.get(rating.t) ?? []), rating]);
      }
      expect(groups.size).toBeGreaterThan(1);
      for (const group of groups.values()) {
        expect(group.length).toBeGreaterThanOrEqual(3);
        expect(group.length).toBeLessThanOrEqual(5);
      }
    }
  });
  it('places each node’s first 3–5 ratings after visible opinions and before its first chat', () => {
    const joins = new Map(social.timeline.filter(event => event.type === 'opinion').map(event => [event.slot, event.t]));
    for (const persona of social.personas) {
      const given = ratings.filter(event => event.from_slot === persona.slot);
      const first = Math.min(...given.map(event => event.t));
      const firstBatch = given.filter(event => event.t === first);
      expect(firstBatch.length).toBeGreaterThanOrEqual(3);
      expect(firstBatch.length).toBeLessThanOrEqual(5);
      const chats = social.timeline.filter(event => event.type === 'chat_open' && (event.from_slot === persona.slot || event.to_slot === persona.slot));
      if (chats.length) expect(first).toBeLessThan(Math.min(...chats.map(event => event.t)));
      for (const rating of given) {
        expect(rating.t).toBeGreaterThan(joins.get(persona.slot) ?? Infinity);
        expect(rating.t).toBeGreaterThan(joins.get(rating.to_slot) ?? Infinity);
      }
    }
  });
});