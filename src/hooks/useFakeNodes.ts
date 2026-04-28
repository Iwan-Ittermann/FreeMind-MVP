import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface FakeNode {
  id: string;
  topic_id: string;
  opinion_text: string;
  created_at: string;
  updated_at: string;
}

export function useFakeNodes(topicId: string) {
  return useQuery({
    queryKey: ['fakeNodes', topicId],
    queryFn: async (): Promise<FakeNode[]> => {
      const { data, error } = await supabase
        .from('fake_nodes')
        .select('*')
        .eq('topic_id', topicId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!topicId,
  });
}

export function useCreateFakeNode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ topicId, opinionText }: { topicId: string; opinionText: string }) => {
      const { data, error } = await supabase
        .from('fake_nodes')
        .insert({ topic_id: topicId, opinion_text: opinionText })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['fakeNodes', variables.topicId] });
      queryClient.invalidateQueries({ queryKey: ['topic', variables.topicId] });
      queryClient.invalidateQueries({ queryKey: ['opinionCount', variables.topicId] });
      toast.success('Fake node created');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create fake node');
    },
  });
}

export function useUpdateFakeNode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, topicId, opinionText }: { id: string; topicId: string; opinionText: string }) => {
      const { data, error } = await supabase
        .from('fake_nodes')
        .update({ opinion_text: opinionText })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['fakeNodes', variables.topicId] });
      queryClient.invalidateQueries({ queryKey: ['topic', variables.topicId] });
      queryClient.invalidateQueries({ queryKey: ['opinionCount', variables.topicId] });
      toast.success('Fake node updated');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update fake node');
    },
  });
}

export function useDeleteFakeNode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, topicId }: { id: string; topicId: string }) => {
      const { error } = await supabase
        .from('fake_nodes')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['fakeNodes', variables.topicId] });
      queryClient.invalidateQueries({ queryKey: ['topic', variables.topicId] });
      queryClient.invalidateQueries({ queryKey: ['opinionCount', variables.topicId] });
      toast.success('Fake node deleted');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete fake node');
    },
  });
}
