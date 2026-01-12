import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Opinion, ChatRating } from '@/types/graph';

export interface TopicData {
  id: string;
  title: string;
  description: string | null;
  opinions: Opinion[];
  ratings: ChatRating[];
}

export function useTopicData(topicId: string) {
  return useQuery({
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

      // Fetch ratings using the function
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
