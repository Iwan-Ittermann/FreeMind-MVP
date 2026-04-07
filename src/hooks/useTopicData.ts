import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Opinion, ChatRating } from '@/types/graph';
import { setAnimationChannel, removeAnimationChannel } from '@/lib/animation-channel';

export interface TopicData {
  id: string;
  title: string;
  description: string | null;
  opinions: Opinion[];
  ratings: ChatRating[];
  /** Map of opinionId → last chat message timestamp (ISO string) or null */
  lastChatActivity: Map<string, string | null>;
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
          queryClient.refetchQueries({ queryKey: ['chatRequests', topicId] });
          queryClient.refetchQueries({ queryKey: ['topic', topicId] });
        }
      )
      // NOTE: opinion_ratings realtime listener intentionally removed.
      // Disagreement ratings change too frequently (slider drags) for realtime.
      // Instead: rater sees immediate update via invalidateQueries in useDisagreementRating,
      // other users see updates via 4-second polling (refetchInterval: 4000).
      .subscribe();

    // Separate broadcast channel for animations (bypasses RLS issues)
    // Use a stable name so useChatMessages can reuse this exact channel instance
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
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          // Register the channel so useChatMessages can reuse it for sending
          setAnimationChannel(topicId, animChannel);
        }
      });

    return () => {
      removeAnimationChannel(topicId);
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

      // Fetch canonical graph pairs (empathy from chat_ratings via accepted chat_requests)
      const { data: ratingsData, error: ratingsError } = await supabase
        .rpc('get_graph_pairs', { topic_uuid: topicId });

      if (ratingsError) throw ratingsError;

      // Fetch ALL standalone disagreement ratings for this topic
      // These drive angular separation and are the single source of truth for disagreement
      const { data: opinionRatingsData, error: opinionRatingsError } = await supabase
        .from('opinion_ratings')
        .select('rater_opinion_id, target_opinion_id, disagreement')
        .eq('topic_id', topicId);

      if (opinionRatingsError) throw opinionRatingsError;

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
        .sort((a, b) => a.id.localeCompare(b.id));

      // Build chat-based ratings (empathy from chats)
      const chatRatingsMap = new Map<string, ChatRating>();
      for (const r of (ratingsData || [])) {
        const key = [r.opinion_a_id, r.opinion_b_id].sort().join('|');
        chatRatingsMap.set(key, {
          opinionA: r.opinion_a_id,
          opinionB: r.opinion_b_id,
          empathy: Number(r.avg_empathy ?? 0),
          disagreement: Number(r.avg_disagreement ?? 50),
        });
      }

      // Aggregate opinion_ratings (disagreement) per pair — average both directions
      const disaggMap = new Map<string, number[]>();
      for (const or of (opinionRatingsData || [])) {
        const key = [or.rater_opinion_id, or.target_opinion_id].sort().join('|');
        if (!disaggMap.has(key)) disaggMap.set(key, []);
        disaggMap.get(key)!.push(or.disagreement);
      }

      // Merge: for each pair, use opinion_ratings disagreement (source of truth)
      // and chat empathy where available. Create synthetic entries for pairs
      // that only have disagreement ratings (no chat).
      const mergedRatingsMap = new Map<string, ChatRating>(chatRatingsMap);

      for (const [key, values] of disaggMap) {
        const avgDisagreement = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
        const [idA, idB] = key.split('|');
        const existing = mergedRatingsMap.get(key);
        if (existing) {
          // Override disagreement with opinion_ratings value
          mergedRatingsMap.set(key, { ...existing, disagreement: avgDisagreement });
        } else {
        // Synthetic entry: no chat, just disagreement rating. Empathy defaults to 0.
          // Marked isSynthetic so it only affects angular positioning, not radial score.
          mergedRatingsMap.set(key, {
            opinionA: idA,
            opinionB: idB,
            empathy: 0,
            disagreement: avgDisagreement,
            isSynthetic: true,
          });
        }
      }

      const formattedRatings = Array.from(mergedRatingsMap.values());

      // Generate ratings for fake nodes (connections between fake nodes only)
      const fakeNodeIds = fakeOpinions.map(op => op.id).sort();
      const fakeRatings = generateFakeNodeRatings(fakeNodeIds);

      // Combine real and fake ratings
      const allRatings = [...formattedRatings, ...fakeRatings];

      // Fetch last chat activity per opinion
      // Get the most recent message timestamp for each opinion via their chats
      const realOpinionIds = formattedOpinions.map(op => op.id);
      const lastChatActivity = new Map<string, string | null>();
      
      if (realOpinionIds.length > 0) {
        const { data: chatActivity } = await supabase
          .from('chats')
          .select('opinion_a_id, opinion_b_id, chat_messages(created_at)')
          .eq('topic_id', topicId)
          .order('created_at', { ascending: false, referencedTable: 'chat_messages' })
          .limit(1, { referencedTable: 'chat_messages' });

        if (chatActivity) {
          for (const chat of chatActivity) {
            const lastMsg = chat.chat_messages?.[0]?.created_at ?? null;
            if (lastMsg) {
              // Update both opinions in the chat
              for (const opId of [chat.opinion_a_id, chat.opinion_b_id]) {
                const existing = lastChatActivity.get(opId);
                if (!existing || lastMsg > existing) {
                  lastChatActivity.set(opId, lastMsg);
                }
              }
            }
          }
        }
      }

      return {
        id: topic.id,
        title: topic.title,
        description: topic.description,
        opinions: allOpinions,
        ratings: allRatings,
        lastChatActivity,
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
