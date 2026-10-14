import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { respectUnlocked } from './rating-rounds';

describe('simulation respect preview', () => {
  it('unlocks after one visitor message and one dummy reply', () => {
    expect(respectUnlocked(1, 0)).toBe(false);
    expect(respectUnlocked(0, 1)).toBe(false);
    expect(respectUnlocked(1, 1)).toBe(true);
  });
});

// Optional live integration check, using only an explicitly supplied test-browser session.
const sessionPath = process.env.SIM_TEST_STORAGE;
describe.skipIf(!sessionPath)('live simulation replies', () => {
  it('rotates ten replies, wraps on the eleventh and never duplicates a retry', async () => {
    if (!sessionPath) return;
    const storage = JSON.parse(readFileSync(sessionPath, 'utf8'));
    const entry = storage.origins.flatMap((origin: { localStorage: { name: string; value: string }[] }) => origin.localStorage)
      .find((item: { name: string }) => /^sb-.*-auth-token$/.test(item.name));
    if (!entry) throw new Error('Missing test session');
    const session = JSON.parse(entry.value);
    const payload = JSON.parse(Buffer.from(session.access_token.split('.')[1], 'base64url').toString());
    const base = payload.iss.replace(/\/auth\/v1$/, '');
    const key = process.env.SIM_TEST_PUBLIC_KEY;
    if (!key) throw new Error('Missing public API key');
    const request = async (path: string, body?: object) => {
      const response = await fetch(`${base}/rest/v1/${path}`, {
        method: body ? 'POST' : 'GET',
        headers: { apikey: key, Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!response.ok) throw new Error(`Test request failed: ${response.status}`);
      return response.json();
    };
    const own = await request(`chat_messages?sender_id=eq.${session.user.id}&order=created_at.desc&limit=1`);
    expect(own).toHaveLength(1);
    const replies: string[] = [];
    for (let index = 0; index < 11; index++) {
      const [message] = await request('chat_messages', { chat_id: own[0].chat_id, sender_id: session.user.id, content: `Simulation integration check ${index + 1}` });
      const replyId = await request('rpc/reply_to_sim_message', { p_message_id: message.id, p_language: 'de' });
      expect(typeof replyId).toBe('string');
      const retryId = await request('rpc/reply_to_sim_message', { p_message_id: message.id, p_language: 'de' });
      expect(retryId).toBe(replyId);
      const rows = await request(`chat_messages?reply_to_id=eq.${message.id}`);
      expect(rows).toHaveLength(1);
      replies.push(rows[0].content);
    }
    expect(new Set(replies.slice(0, 10)).size).toBe(10);
    expect(replies[10]).toBe(replies[0]);
  }, 90_000);
});