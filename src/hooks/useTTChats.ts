import { useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useChatDrafts } from './useChatDrafts';

export interface TTChatItem {
  /** Chat id, or `pending:<opinionId>` when the conversation has not started. */
  id: string;
  /** The OTHER user's opinion id (for opening EmbeddedChatView). */
  theirOpinionId: string;
  opinionText: string;
  /** AI generated short conversation title (falls back to the opinion text). */
  title?: string | null;
  lastMessage?: string;
  lastMessageAt?: string;
  /** false when only a disagreement rating exists (no chat row / no messages). */
  started: boolean;
  /** Unsent local draft, if any. */
  draft?: string;
  /** When the user rated this opinion (used to sort not-started entries). */
  ratedAt?: string;
}

/**
 * TT chat data: every opinion the user has rated shows up here — chats that
 * already run, plus not-yet-started conversations.
 */
export function useTTChats(topicId: string, unreadMap?: Map<string, number>) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const drafts = useChatDrafts();

  const { data: myOpinion } = useQuery({
    queryKey: ['myOpinionForTopic', topicId, user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('opinions_public')
        .select('id')
        .eq('topic_id', topicId)
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!topicId && !!user?.id,
  });

  const { data: raw = [] } = useQuery({
    queryKey: ['ttChats', topicId, myOpinion?.id],
    queryFn: async (): Promise<TTChatItem[]> => {
      if (!myOpinion?.id) return [];

      const [{ data: chatData, error }, { data: ratingRows }] = await Promise.all([
        supabase
          .from('chats')
          .select('id, title, opinion_a_id, opinion_b_id, created_at')
          .eq('topic_id', topicId)
          .or(`opinion_a_id.eq.${myOpinion.id},opinion_b_id.eq.${myOpinion.id}`)
          .order('created_at', { ascending: false }),
        supabase
          .from('opinion_ratings')
          .select('target_opinion_id, created_at')
          .eq('topic_id', topicId)
          .eq('rater_opinion_id', myOpinion.id),
      ]);
      if (error) throw error;

      const chatRows = chatData ?? [];
      const chatOtherIds = chatRows.map((c) =>
        c.opinion_a_id === myOpinion.id ? c.opinion_b_id : c.opinion_a_id,
      );
      const ratedIds = (ratingRows ?? [])
        .map((r) => r.target_opinion_id)
        .filter((id) => id !== myOpinion.id);
      const ratedAtMap = new Map<string, string>(
        (ratingRows ?? []).map((r) => [r.target_opinion_id, r.created_at as string]),
      );

      const allIds = Array.from(new Set([...chatOtherIds, ...ratedIds]));
      if (allIds.length === 0) return [];

      const { data: opinionsData } = await supabase
        .from('opinions_public')
        .select('id, text')
        .in('id', allIds);
      const textMap = new Map(opinionsData?.map((o) => [o.id, o.text]) || []);

      let lastMsgMap = new Map<string, { content: string; created_at: string }>();
      if (chatRows.length > 0) {
        const { data: messagesData } = await supabase
          .from('chat_messages')
          .select('chat_id, content, created_at')
          .in('chat_id', chatRows.map((c) => c.id))
          .order('created_at', { ascending: false });
        messagesData?.forEach((m) => {
          if (!lastMsgMap.has(m.chat_id)) {
            lastMsgMap.set(m.chat_id, { content: m.content, created_at: m.created_at });
          }
        });
      }

      const items: TTChatItem[] = [];
      const seen = new Set<string>();

      for (const c of chatRows) {
        const theirOpinionId = c.opinion_a_id === myOpinion.id ? c.opinion_b_id : c.opinion_a_id;
        if (!textMap.has(theirOpinionId)) continue;
        seen.add(theirOpinionId);
        const last = lastMsgMap.get(c.id);
        items.push({
          id: c.id,
          theirOpinionId,
          opinionText: textMap.get(theirOpinionId) || '…',
          title: (c as { title?: string | null }).title ?? null,
          lastMessage: last?.content,
          lastMessageAt: last?.created_at,
          started: !!last,
          ratedAt: ratedAtMap.get(theirOpinionId),
        });
      }

      // Rated opinions without a chat row yet
      for (const id of ratedIds) {
        if (seen.has(id) || !textMap.has(id)) continue;
        items.push({
          id: `pending:${id}`,
          theirOpinionId: id,
          opinionText: textMap.get(id) || '…',
          title: null,
          started: false,
          ratedAt: ratedAtMap.get(id),
        });
      }

      return items;
    },
    enabled: !!myOpinion?.id,
    refetchInterval: 4000,
  });

  // Merge drafts + unread counts and sort messenger-style.
  const chats = useMemo(() => {
    const withMeta = raw.map((c) => ({
      ...c,
      draft: drafts.get(c.theirOpinionId),
      unreadCount: unreadMap?.get(c.theirOpinionId) ?? 0,
    }));

    return withMeta.sort((a, b) => {
      // 1) unread first
      if ((b.unreadCount > 0 ? 1 : 0) !== (a.unreadCount > 0 ? 1 : 0)) {
        return (b.unreadCount > 0 ? 1 : 0) - (a.unreadCount > 0 ? 1 : 0);
      }
      // 2) drafts next
      const da = a.draft ? 1 : 0;
      const db = b.draft ? 1 : 0;
      if (da !== db) return db - da;
      // 3) started chats by last activity
      if (a.started !== b.started) return a.started ? -1 : 1;
      const ta = a.lastMessageAt ?? a.ratedAt ?? '';
      const tb = b.lastMessageAt ?? b.ratedAt ?? '';
      if (ta !== tb) return tb.localeCompare(ta);
      return a.theirOpinionId.localeCompare(b.theirOpinionId);
    });
  }, [raw, drafts, unreadMap]);

  // Realtime: refresh on chat changes
  useEffect(() => {
    if (!myOpinion?.id || !topicId) return;
    const channel = supabase
      .channel(`tt-chats-${topicId}-${Date.now()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chats', filter: `topic_id=eq.${topicId}` },
        () => {
          queryClient.refetchQueries({ queryKey: ['ttChats', topicId, myOpinion.id] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [topicId, myOpinion?.id, queryClient]);

  return { chats, myOpinionId: myOpinion?.id ?? null };
}

/** All disagreement ratings the current user gave in this topic. */
export function useMyOpinionRatings(topicId: string, myOpinionId: string | null) {
  return useQuery({
    queryKey: ['myOpinionRatings', topicId, myOpinionId],
    queryFn: async (): Promise<Map<string, number>> => {
      if (!myOpinionId) return new Map();
      const { data, error } = await supabase
        .from('opinion_ratings')
        .select('target_opinion_id, disagreement')
        .eq('topic_id', topicId)
        .eq('rater_opinion_id', myOpinionId);
      if (error) throw error;
      return new Map((data ?? []).map((r) => [r.target_opinion_id, r.disagreement]));
    },
    enabled: !!topicId && !!myOpinionId,
    refetchInterval: 8000,
  });
}
