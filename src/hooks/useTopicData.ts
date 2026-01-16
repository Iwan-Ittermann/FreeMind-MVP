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

export interface MessageAnimationData {
  id: string;
  chatId: string;
  sourceOpinionId: string;
  targetOpinionId: string;
  timestamp: number;
}

export function useTopicData(topicId: string) {
  const queryClient = useQueryClient();
  const [activeChats, setActiveChats] = useState<ActiveChat[]>([]);
  const [messageAnimations, setMessageAnimations] = useState<MessageAnimationData[]>([]);

  // Clean up stale active chats (older than 3 seconds) and message animations (older than 1 second)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setActiveChats(prev => 
        prev.filter(chat => now - chat.lastActivity < 3000)
      );
      setMessageAnimations(prev =>
        prev.filter(anim => now - anim.timestamp < 1000)
      );
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Subscribe to real-time updates for opinions, ratings, chats, chat_requests, and messages
  useEffect(() => {
    if (!topicId) return;

    const channel = supabase
      .channel(`topic-${topicId}-realtime`)
      // Listen for opinion changes (new nodes, updates, deletes)
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
      // Listen for new/updated chats (new edges)
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
      // Listen for chat_request changes (pending request edges)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_requests',
          filter: `topic_id=eq.${topicId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['chatRequests', topicId] });
        }
      )
      // Listen for new messages (activity indicator + animation)
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
          const senderId = payload.new.sender_id;
          const messageId = payload.new.id;
          
          const { data: chat } = await supabase
            .from('chats')
            .select('opinion_a_id, opinion_b_id, topic_id')
            .eq('id', chatId)
            .single();
          
          if (chat && chat.topic_id === topicId) {
            // Determine which opinion sent the message by looking up sender's opinion
            const { data: senderOpinion } = await supabase
              .from('opinions')
              .select('id')
              .eq('user_id', senderId)
              .eq('topic_id', topicId)
              .single();

            const sourceOpinionId = senderOpinion?.id || chat.opinion_a_id;
            const targetOpinionId = sourceOpinionId === chat.opinion_a_id 
              ? chat.opinion_b_id 
              : chat.opinion_a_id;

            // Add message animation
            setMessageAnimations(prev => [...prev, {
              id: messageId,
              chatId,
              sourceOpinionId,
              targetOpinionId,
              timestamp: Date.now(),
            }]);

            // Update active chats
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

      // Fetch ALL chats for this topic (to show edges even without ratings)
      const { data: chatsData, error: chatsError } = await supabase
        .from('chats')
        .select('opinion_a_id, opinion_b_id')
        .eq('topic_id', topicId);

      if (chatsError) throw chatsError;

      // Fetch ratings using the function (for chats that have ratings)
      const { data: ratingsData, error: ratingsError } = await supabase
        .rpc('get_opinion_pair_ratings', { topic_uuid: topicId });

      if (ratingsError) throw ratingsError;

      // Transform opinions to our graph format (including moderation fields)
      const formattedOpinions: Opinion[] = (opinions || []).map(op => ({
        id: op.id,
        text: op.text,
        authorId: op.user_id,
        createdAt: new Date(op.created_at),
        status: op.status as Opinion['status'],
        visible: op.visible ?? true,
        noticeText: op.notice_text ?? undefined,
      }));

      // Create a map of ratings by opinion pair for quick lookup
      // empathy: -50 to +50, disagreement: 0 to 100
      const ratingsMap = new Map<string, { empathy: number; disagreement: number }>();
      (ratingsData || []).forEach(r => {
        const key = [r.opinion_a_id, r.opinion_b_id].sort().join('-');
        ratingsMap.set(key, {
          empathy: Number(r.avg_empathy) ?? 0,
          disagreement: Number(r.avg_disagreement) ?? 50,
        });
      });

      // Create ratings for ALL chats (using defaults if no ratings exist)
      // Default empathy: 0 (neutral), default disagreement: 50 (middle)
      const formattedRatings: ChatRating[] = (chatsData || []).map(chat => {
        const key = [chat.opinion_a_id, chat.opinion_b_id].sort().join('-');
        const existingRating = ratingsMap.get(key);
        
        return {
          opinionA: chat.opinion_a_id,
          opinionB: chat.opinion_b_id,
          empathy: existingRating?.empathy ?? 0,
          disagreement: existingRating?.disagreement ?? 50,
        };
      });

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
    messageAnimations,
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
