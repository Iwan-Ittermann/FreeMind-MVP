import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, useMemo } from 'react';
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

// Seeded random number generator for deterministic fake node ratings
function seededRandom(seed: string): () => number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return function() {
    hash = Math.imul(hash ^ (hash >>> 16), 0x85ebca6b);
    hash = Math.imul(hash ^ (hash >>> 13), 0xc2b2ae35);
    hash ^= hash >>> 16;
    return (hash >>> 0) / 0xffffffff;
  };
}

// Generate random ratings for fake nodes
function generateFakeNodeRatings(fakeNodeIds: string[]): ChatRating[] {
  const ratings: ChatRating[] = [];
  
  if (fakeNodeIds.length < 2) return ratings;
  
  // Create deterministic ratings between fake nodes
  for (let i = 0; i < fakeNodeIds.length; i++) {
    for (let j = i + 1; j < fakeNodeIds.length; j++) {
      // IMPORTANT: make the seed order-invariant so all clients generate
      // identical fake ratings regardless of fetch ordering.
      const seedStr = [fakeNodeIds[i], fakeNodeIds[j]].sort().join('-');
      const rng = seededRandom(seedStr);
      
      // Empathy: -20 to +50
      const empathy = Math.round(-20 + rng() * 70);
      // Disagreement: 80 to 100
      const disagreement = Math.round(80 + rng() * 20);
      
      ratings.push({
        opinionA: fakeNodeIds[i],
        opinionB: fakeNodeIds[j],
        empathy,
        disagreement,
      });
    }
  }
  
  return ratings;
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
        prev.filter(anim => now - anim.timestamp < 2000)
      );
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Subscribe to real-time updates for opinions, ratings, chats, chat_requests, and messages
  useEffect(() => {
    if (!topicId) return;

    // Use unique channel name with timestamp to avoid subscription conflicts across remounts
    const channelName = `topic-${topicId}-realtime-${Date.now()}`;
    const channel = supabase
      .channel(channelName)
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
          queryClient.refetchQueries({ queryKey: ['topic', topicId] });
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
          queryClient.refetchQueries({ queryKey: ['topic', topicId] });
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
          queryClient.refetchQueries({ queryKey: ['topic', topicId] });
        }
      )
      // Listen for fake_nodes changes (admin-managed fake opinions)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'fake_nodes',
          filter: `topic_id=eq.${topicId}`,
        },
        () => {
          queryClient.refetchQueries({ queryKey: ['topic', topicId] });
        }
      )
      // Listen for chat_request changes (pending request edges AND accepted edges for graph)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_requests',
          filter: `topic_id=eq.${topicId}`,
        },
        () => {
          // Force immediate refetch for both chatRequests AND topic
          queryClient.refetchQueries({ queryKey: ['chatRequests', topicId] });
          queryClient.refetchQueries({ queryKey: ['topic', topicId] });
        }
      )
      .subscribe();

    // Separate broadcast channel for animations (bypasses RLS issues)
    const animChannelName = `topic-${topicId}-animations`;
    const animChannel = supabase
      .channel(animChannelName, {
        config: { broadcast: { self: true } },
      })
      .on('broadcast', { event: 'message-animation' }, (payload) => {
        const data = payload.payload as {
          sourceOpinionId: string;
          targetOpinionId: string;
          chatId: string;
        };

        // Add message animation
        const animId = `${data.chatId}-${Date.now()}`;
        setMessageAnimations(prev => [...prev, {
          id: animId,
          chatId: data.chatId,
          sourceOpinionId: data.sourceOpinionId,
          targetOpinionId: data.targetOpinionId,
          timestamp: Date.now(),
        }]);

        // Update active chats
        setActiveChats(prev => {
          const existing = prev.find(c => c.chatId === data.chatId);
          if (existing) {
            return prev.map(c =>
              c.chatId === data.chatId
                ? { ...c, lastActivity: Date.now() }
                : c
            );
          }
          return [...prev, {
            chatId: data.chatId,
            opinionAId: data.sourceOpinionId,
            opinionBId: data.targetOpinionId,
            lastActivity: Date.now(),
          }];
        });

        // Refetch unread messages
        queryClient.refetchQueries({ queryKey: ['unreadMessages', topicId] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(animChannel);
    };
  }, [topicId, queryClient]);

  const query = useQuery({
    queryKey: ['topic', topicId],
    enabled: !!topicId,
    // Fallback for browsers/environments where realtime websocket events can be
    // delayed/blocked: keep the graph consistent by periodically refreshing.
    // (Also helps recover from missed events / reconnects.)
    refetchInterval: () => {
      if (typeof document === 'undefined') return false;
      return document.visibilityState === 'visible' ? 4000 : false;
    },
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    queryFn: async (): Promise<TopicData> => {
      // Fetch topic
      const { data: topic, error: topicError } = await supabase
        .from('topics')
        .select('*')
        .eq('id', topicId)
        .maybeSingle();

      if (topicError) throw topicError;
      if (!topic) throw new Error('Topic not found');

      // Fetch ONLY visible opinions for canonical layout (all users see same set)
      const { data: opinions, error: opinionsError } = await supabase
        .from('opinions_public')
        .select('*')
        .eq('topic_id', topicId)
        .eq('visible', true)
        .order('id', { ascending: true });

      if (opinionsError) throw opinionsError;

      // Fetch fake nodes for this topic
      const { data: fakeNodes, error: fakeNodesError } = await supabase
        .from('fake_nodes')
        .select('*')
        .eq('topic_id', topicId)
        .order('id', { ascending: true });

      if (fakeNodesError) throw fakeNodesError;

      // Fetch canonical graph pairs using SECURITY DEFINER function
      // This returns only accepted chat_requests with both opinions visible
      // All users get the same result regardless of RLS on chats table
      const { data: ratingsData, error: ratingsError } = await supabase
        .rpc('get_graph_pairs', { topic_uuid: topicId });

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

      // Add fake nodes as opinions (with fake- prefix to distinguish)
      const fakeOpinions: Opinion[] = (fakeNodes || []).map(fn => ({
        id: `fake-${fn.id}`,
        text: fn.opinion_text,
        authorId: undefined,
        createdAt: new Date(fn.created_at),
        status: 'Visible' as const,
        visible: true,
      }));

      // Combine real and fake opinions
      const allOpinions = [...formattedOpinions, ...fakeOpinions]
        // Stable ordering across clients (helps deterministic layout)
        .sort((a, b) => a.id.localeCompare(b.id));

      // Build deterministic graph edges/weights from aggregated ratings
      // Default empathy: 0 (neutral), default disagreement: 50 (middle)
      const formattedRatings: ChatRating[] = (ratingsData || []).map(r => ({
        opinionA: r.opinion_a_id,
        opinionB: r.opinion_b_id,
        empathy: Number(r.avg_empathy ?? 0),
        disagreement: Number(r.avg_disagreement ?? 50),
      }));

      // Generate ratings for fake nodes (connections between fake nodes only)
      const fakeNodeIds = fakeOpinions.map(op => op.id).sort();
      const fakeRatings = generateFakeNodeRatings(fakeNodeIds);

      // Combine real and fake ratings
      const allRatings = [...formattedRatings, ...fakeRatings];

      return {
        id: topic.id,
        title: topic.title,
        description: topic.description,
        opinions: allOpinions,
        ratings: allRatings,
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
      // Use secure view that excludes ip_address
      const { count, error } = await supabase
        .from('opinions_public')
        .select('*', { count: 'exact', head: true })
        .eq('topic_id', topicId);

      if (error) throw error;
      return count || 0;
    },
  });
}
