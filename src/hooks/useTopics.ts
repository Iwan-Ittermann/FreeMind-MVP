import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useClientIP } from './useClientIP';

export interface Topic {
  id: string;
  title: string;
  description: string | null;
  url_slug: string;
  status: 'Active' | 'Archived' | 'Deleted';
  created_by: string | null;
  created_at: string;
  is_active: boolean;
}

export interface UserTopic {
  topic_id: string;
  title: string;
  description: string | null;
  url_slug: string;
  status: string;
  joined_at: string;
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

// User: Get topics user has joined
export function useUserTopics() {
  return useQuery({
    queryKey: ['topics', 'user'],
    queryFn: async (): Promise<UserTopic[]> => {
      const { data, error } = await supabase.rpc('get_user_topics');

      if (error) throw error;
      return data as UserTopic[];
    },
  });
}

// Check if user has joined a specific topic
export function useHasJoinedTopic(topicId: string) {
  return useQuery({
    queryKey: ['topics', 'joined', topicId],
    queryFn: async (): Promise<boolean> => {
      const { data, error } = await supabase.rpc('has_joined_topic', { _topic_id: topicId });

      if (error) throw error;
      return data as boolean;
    },
    enabled: !!topicId,
  });
}

// Get topic by slug
export function useTopicBySlug(slug: string) {
  return useQuery({
    queryKey: ['topics', 'slug', slug],
    queryFn: async (): Promise<Topic | null> => {
      const { data, error } = await supabase
        .from('topics')
        .select('*')
        .eq('url_slug', slug)
        .eq('status', 'Active')
        .maybeSingle();

      if (error) throw error;
      return data as Topic | null;
    },
    enabled: !!slug,
  });
}

// Admin: Create topic
export function useCreateTopic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ title, description }: { title: string; description?: string }) => {
      const { data, error } = await supabase.rpc('create_topic', {
        _title: title,
        _description: description || null,
      });

      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['topics'] });
    },
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

// User: Join topic
export function useJoinTopic() {
  const queryClient = useQueryClient();
  const { ip } = useClientIP();

  return useMutation({
    mutationFn: async (slug: string) => {
      const { data, error } = await supabase.rpc('join_topic', {
        _topic_slug: slug,
        _ip_address: ip || null,
      });

      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['topics'] });
    },
  });
}

// Get topic member count (admin)
export function useTopicMemberCount(topicId: string, enabled = false) {
  return useQuery({
    queryKey: ['topics', 'members', topicId],
    queryFn: async (): Promise<number> => {
      const { count, error } = await supabase
        .from('user_topics')
        .select('*', { count: 'exact', head: true })
        .eq('topic_id', topicId);

      if (error) throw error;
      return count || 0;
    },
    enabled: enabled && !!topicId,
  });
}
