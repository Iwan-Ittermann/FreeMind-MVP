import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Topic {
  id: string;
  title: string;
  description: string | null;
  url_slug: string;
  short_code: string;
  status: 'Active' | 'Archived' | 'Deleted';
  created_by: string | null;
  created_at: string;
  is_active: boolean;
}

// Admin: Get all topics
export function useAllTopics(enabled = false) {
  return useQuery({
    queryKey: ['topics', 'all'],
    queryFn: async (): Promise<Topic[]> => {
      const { data, error } = await supabase
        .from('topics')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Topic[];
    },
    enabled,
  });
}

// Admin: Update topic status
export function useUpdateTopicStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ topicId, status }: { topicId: string; status: 'Active' | 'Archived' | 'Deleted' }) => {
      const { error } = await supabase.rpc('update_topic_status', {
        _topic_id: topicId,
        _new_status: status,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['topics'] });
    },
  });
}

// Admin: Update topic title
export function useUpdateTopicTitle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ topicId, title }: { topicId: string; title: string }) => {
      const { error } = await supabase
        .from('topics')
        .update({ title })
        .eq('id', topicId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['topics'] });
    },
  });
}

// Admin: Update topic description
export function useUpdateTopicDescription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ topicId, description }: { topicId: string; description: string | null }) => {
      const { error } = await supabase
        .from('topics')
        .update({ description })
        .eq('id', topicId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['topics'] });
    },
  });
}
