import { describe, expect, it } from 'vitest';
import { unansweredChats } from './unanswered-chat';
import { getWediumCampaign } from './wedium-campaigns';
const chats = [{ id: 'chat', a: 'me', b: 'other' }];
const incoming = { id: '1', chat_id: 'chat', sender_id: 'other', content: 'Frage', created_at: '2026-11-14T06:00:00Z' };
describe('Wedium reply reminders', () => {
  it('includes received messages without a later reply', () => expect(unansweredChats('me', chats, [incoming])).toEqual([incoming]));
  it('excludes chats after the recipient replies', () => expect(unansweredChats('me', chats, [incoming, { ...incoming, id: '2', sender_id: 'me', created_at: '2026-11-14T06:01:00Z' }])).toEqual([]));
  it('excludes people outside the chat', () => expect(unansweredChats('outsider', chats, [incoming])).toEqual([]));
  it('never includes own outgoing messages', () => expect(unansweredChats('other', chats, [incoming])).toEqual([]));
  it('disables the last-day mail', () => { expect(getWediumCampaign('campaign-wedium-final-day')?.disabled).toBe(true); expect(getWediumCampaign('campaign-wedium-final-day')?.dueAt).toBeUndefined(); });
});