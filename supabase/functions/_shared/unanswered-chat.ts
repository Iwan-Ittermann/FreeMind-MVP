export interface ReplyMessage { id: string; chat_id: string; sender_id: string; content: string; created_at: string }
export interface ReplyChat { id: string; a: string; b: string }

/** Only the recipient of a chat's latest visible message still owes a reply. */
export function unansweredChats(userId: string, chats: ReplyChat[], messages: ReplyMessage[]) {
  const latest = new Map<string, ReplyMessage>();
  for (const message of messages) {
    const old = latest.get(message.chat_id);
    if (!old || message.created_at > old.created_at || (message.created_at === old.created_at && message.id > old.id)) latest.set(message.chat_id, message);
  }
  return chats.flatMap(chat => {
    const message = latest.get(chat.id);
    const other = chat.a === userId ? chat.b : chat.b === userId ? chat.a : null;
    return message && other && message.sender_id === other ? [message] : [];
  }).sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id));
}