// Endspurt mail: pick ONE main call-to-action per participant.
// Hierarchy (first match wins):
//   1. understanding – a chat where both sides wrote, but the user has not
//      rated on the understanding scale yet (most important for bridge points)
//   2. reply         – the latest message of a chat is from the partner
//   3. start-chat    – has an opinion but no unlocked/pending chat left
//   4. opinion       – confirmed but no opinion yet
import { unansweredChats, type ReplyChat, type ReplyMessage } from './unanswered-chat.ts';

export type EndspurtSegment = 'understanding' | 'reply' | 'start-chat' | 'opinion';

export interface EndspurtInput {
  userId: string;
  hasOpinion: boolean;
  chats: ReplyChat[];
  messages: ReplyMessage[];
  /** chat ids the user already rated on the understanding scale */
  ratedChatIds: Set<string>;
}

export interface EndspurtResult {
  segment: EndspurtSegment;
  /** chat the main CTA refers to (understanding/reply) */
  chatId: string | null;
  unratedCount: number;
  unansweredCount: number;
  /** latest partner message in the focus chat, if any */
  partnerMessage: ReplyMessage | null;
  /** latest own message in the focus chat, if any */
  ownMessage: ReplyMessage | null;
}

export function endspurtSegment(input: EndspurtInput): EndspurtResult {
  const { userId, chats, messages, ratedChatIds } = input;
  const byChat = new Map<string, ReplyMessage[]>();
  for (const m of messages) {
    const list = byChat.get(m.chat_id) ?? [];
    list.push(m);
    byChat.set(m.chat_id, list);
  }
  const latestOf = (list: ReplyMessage[], pred: (m: ReplyMessage) => boolean) =>
    list.filter(pred).sort((a, b) => b.created_at.localeCompare(a.created_at))[0] ?? null;

  const unrated = chats.filter((c) => {
    const list = byChat.get(c.id) ?? [];
    const own = list.some((m) => m.sender_id === userId);
    const partner = list.some((m) => m.sender_id !== userId);
    return own && partner && !ratedChatIds.has(c.id);
  });
  const unanswered = unansweredChats(userId, chats, messages);

  const focus = (segment: EndspurtSegment, chatId: string | null): EndspurtResult => {
    const list = chatId ? byChat.get(chatId) ?? [] : [];
    return {
      segment, chatId,
      unratedCount: unrated.length,
      unansweredCount: unanswered.length,
      partnerMessage: latestOf(list, (m) => m.sender_id !== userId),
      ownMessage: latestOf(list, (m) => m.sender_id === userId),
    };
  };

  if (unrated.length) {
    // most recently active unrated chat
    const sorted = [...unrated].sort((a, b) => {
      const la = latestOf(byChat.get(a.id) ?? [], () => true)?.created_at ?? '';
      const lb = latestOf(byChat.get(b.id) ?? [], () => true)?.created_at ?? '';
      return lb.localeCompare(la);
    });
    return focus('understanding', sorted[0].id);
  }
  if (unanswered.length) return focus('reply', unanswered[0].chat_id);
  if (input.hasOpinion) return focus('start-chat', null);
  return focus('opinion', null);
}

/** Shorten at a sentence or word boundary, never mid-word. */
export function smartTruncate(text: string, max = 200): string {
  const clean = String(text ?? '').replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const sentence = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '));
  if (sentence >= max * 0.5) return cut.slice(0, sentence + 1);
  const word = cut.lastIndexOf(' ');
  return (word > max * 0.6 ? cut.slice(0, word) : cut).replace(/[,;:\-–]+$/, '') + ' …';
}
