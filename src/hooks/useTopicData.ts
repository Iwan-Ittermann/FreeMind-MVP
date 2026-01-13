import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Opinion, ChatRating } from '@/types/graph';

export interface TopicData {
  id: string;
  title: string;
  description: string | null;
  opinions: Opinion[];
  ratings: ChatRating[];
}

export interface ActiveChat {
  chatId: string;
  opinionAId: string;
  opinionBId: string;
  lastActivity: number;
}

export function useTopicData(topicId: string) {
  const queryClient = useQueryClient();
  const [activeChats, setActiveChats] = useState<ActiveChat[]>([]);

  // Clean up stale active chats (older than 3 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveChats(prev => 
        prev.filter(chat => Date.now() - chat.lastActivity < 3000)
      );
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Subscribe to real-time updates for opinions, ratings, chats, and messages
  useEffect(() => {
    if (!topicId) return;

    const channel = supabase
      .channel(`topic-${topicId}-realtime`)
      // Listen for opinion changes
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'opinions',
          filter: `topic_id=eq.${topicId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['topic', topicId] });
        }
      )
      // Listen for chat rating changes (affects node positions)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_ratings',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['topic', topicId] });
        }
      )
      // Listen for new chats being created (new edges)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chats',
          filter: `topic_id=eq.${topicId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['topic', topicId] });
        }
      )
      // Listen for new messages (activity indicator)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
        },
        async (payload) => {
          // Get the chat details to find which opinions are involved
          const chatId = payload.new.chat_id;
          const { data: chat } = await supabase
            .from('chats')
            .select('opinion_a_id, opinion_b_id, topic_id')
            .eq('id', chatId)
            .single();
          
          if (chat && chat.topic_id === topicId) {
            setActiveChats(prev => {
              const existing = prev.find(c => c.chatId === chatId);
              if (existing) {
                return prev.map(c => 
                  c.chatId === chatId 
                    ? { ...c, lastActivity: Date.now() }
                    : c
                );
              }
              return [...prev, {
                chatId,
                opinionAId: chat.opinion_a_id,
                opinionBId: chat.opinion_b_id,
                lastActivity: Date.now(),
              }];
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [topicId, queryClient]);

  const query = useQuery({
    queryKey: ['topic', topicId],
    queryFn: async (): Promise<TopicData> => {
      // Fetch topic
      const { data: topic, error: topicError } = await supabase
        .from('topics')
        .select('*')
        .eq('id', topicId)
        .maybeSingle();

      if (topicError) throw topicError;
      if (!topic) throw new Error('Topic not found');

      // Fetch opinions for this topic
      const { data: opinions, error: opinionsError } = await supabase
        .from('opinions')
        .select('*')
        .eq('topic_id', topicId);

      if (opinionsError) throw opinionsError;

      // Fetch ratings using the function (only for accepted chats that have ratings)
      const { data: ratingsData, error: ratingsError } = await supabase
        .rpc('get_opinion_pair_ratings', { topic_uuid: topicId });

      if (ratingsError) throw ratingsError;

      // Transform opinions to our graph format
      const formattedOpinions: Opinion[] = (opinions || []).map(op => ({
        id: op.id,
        text: op.text,
        authorId: op.user_id,
        createdAt: new Date(op.created_at),
      }));

      // Transform ratings to our graph format
      const formattedRatings: ChatRating[] = (ratingsData || []).map(r => ({
        opinionA: r.opinion_a_id,
        opinionB: r.opinion_b_id,
        empathy: Number(r.avg_empathy) || 0.5,
        disagreement: Number(r.avg_disagreement) || 0.5,
      }));

      return {
        id: topic.id,
        title: topic.title,
        description: topic.description,
        opinions: formattedOpinions,
        ratings: formattedRatings,
      };
    },
  });

  return {
    ...query,
    activeChats,
  };
}

export function useOpinionCount(topicId: string) {
  return useQuery({
    queryKey: ['opinionCount', topicId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('opinions')
        .select('*', { count: 'exact', head: true })
        .eq('topic_id', topicId);

      if (error) throw error;
      return count || 0;
    },
  });
}
