import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * One directed chat arrow: drawn at `fromOpinionId`, pointing towards
 * `toOpinionId`. Length encodes the chat length (messages of both sides),
 * color encodes the respect this node GAVE to its counterpart (0–100).
 */
export interface ChatArrow {
  fromOpinionId: string;
  toOpinionId: string;
  messageCount: number;
  /** null when the pair has no rating yet. */
  receivedPoints: number | null;
  /** The opinion difference rated by this arrow's source, on the 0–10 scale. */
  givenDifference?: number;
  givenRespect: number | null;
}

/**
 * Loads all public chats of a topic plus the directed ratings and derives one
 * arrow per chat participant. Read-only, uses existing public RPCs.
 */
export function useChatArrows(topicId: string, enabled = true) {
  return useQuery({
    queryKey: ['chat-arrows', topicId],
    enabled: enabled && !!topicId,
    refetchInterval: 8000,
    queryFn: async (): Promise<ChatArrow[]> => {
      const [{ data: chats, error: chatsError }, { data: pairs, error: pairsError }] =
        await Promise.all([
          supabase.rpc('get_topic_chats', { _topic_id: topicId }),
          supabase.rpc('get_topic_directed_pairs', { _topic_id: topicId }),
        ]);
      if (chatsError) throw chatsError;
      if (pairsError) throw pairsError;

      // directed lookups: rater -> target
      const empathy = new Map<string, number>();
      const disagreement = new Map<string, number>();
      for (const p of pairs ?? []) {
        const key = `${p.rater_opinion_id}|${p.target_opinion_id}`;
        if (p.empathy != null) empathy.set(key, Number(p.empathy));
        if (p.disagreement != null) disagreement.set(key, Number(p.disagreement));
      }

      /** Points node X received in the chat with Y. */
      const receivedPoints = (x: string, y: string): number | null => {
        const understanding = empathy.get(`${y}|${x}`); // rated BY the counterpart
        const ownDifference = disagreement.get(`${x}|${y}`); // own difference rating
        if (understanding == null || ownDifference == null) return null;
        return understanding * ownDifference;
      };

      const arrows: ChatArrow[] = [];
      for (const c of chats ?? []) {
        const count = Number(c.message_count ?? 0);
        if (count <= 0) continue;
        const a = c.opinion_a_id as string;
        const b = c.opinion_b_id as string;
        arrows.push({
          fromOpinionId: a,
          toOpinionId: b,
          messageCount: count,
          receivedPoints: receivedPoints(a, b),
          givenDifference: disagreement.get(`${a}|${b}`),
          givenRespect: empathy.has(`${a}|${b}`) ? Number(empathy.get(`${a}|${b}`)) * 10 : null,
        });
        arrows.push({
          fromOpinionId: b,
          toOpinionId: a,
          messageCount: count,
          receivedPoints: receivedPoints(b, a),
          givenDifference: disagreement.get(`${b}|${a}`),
          givenRespect: empathy.has(`${b}|${a}`) ? Number(empathy.get(`${b}|${a}`)) * 10 : null,
        });
      }
      return arrows;
    },
  });
}
