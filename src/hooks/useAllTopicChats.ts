import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AllTopicChatItem {
  id: string;
  opinionAId: string;
  opinionBId: string;
  title: string | null;
  opinionAText: string;
  opinionBText: string;
  lastMessage: string | null;
  lastMessageAt: string | null;
  messageCount: number;
}

/** Every started conversation in a topic — read-only overview ("Alle Chats"). */
export function useAllTopicChats(topicId: string, enabled = true) {
  return useQuery({
    queryKey: ['allTopicChats', topicId],
    enabled: !!topicId && enabled,
    refetchInterval: 4000,
    queryFn: async (): Promise<AllTopicChatItem[]> => {
      const { data, error } = await supabase.rpc('get_topic_chats', { _topic_id: topicId });
      if (error) throw error;
      return (data ?? []).map((row) => ({
        id: row.id,
        opinionAId: row.opinion_a_id,
        opinionBId: row.opinion_b_id,
        title: row.title ?? null,
        opinionAText: row.opinion_a_text ?? '',
        opinionBText: row.opinion_b_text ?? '',
        lastMessage: row.last_message ?? null,
        lastMessageAt: row.last_message_at ?? null,
        messageCount: Number(row.message_count ?? 0),
      }));
    },
  });
}
