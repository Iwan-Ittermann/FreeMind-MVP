import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface UserBlock {
  id: string;
  blocker_id: string;
  blocked_user_id: string;
  chat_id: string | null;
  created_at: string;
  reason: string | null;
}

export function useUserBlocks(chatId: string | null, otherUserId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Check if the current user has blocked the other user in this chat
  const { data: blockStatus, isLoading } = useQuery({
    queryKey: ['userBlock', chatId, user?.id, otherUserId],
    queryFn: async () => {
      if (!chatId || !user?.id || !otherUserId) return null;
      
      const { data, error } = await supabase
        .from('user_blocks')
        .select('*')
        .eq('blocker_id', user.id)
        .eq('blocked_user_id', otherUserId)
        .eq('chat_id', chatId)
        .maybeSingle();
      
      if (error) throw error;
      return data as UserBlock | null;
    },
    enabled: !!chatId && !!user?.id && !!otherUserId,
  });

  // Check if we've been blocked by the other user
  const { data: blockedByOther } = useQuery({
    queryKey: ['blockedByUser', chatId, user?.id, otherUserId],
    queryFn: async () => {
      if (!chatId || !user?.id || !otherUserId) return false;
      
      const { data, error } = await supabase
        .from('user_blocks')
        .select('id')
        .eq('blocker_id', otherUserId)
        .eq('blocked_user_id', user.id)
        .eq('chat_id', chatId)
        .maybeSingle();
      
      if (error) throw error;
      return !!data;
    },
    enabled: !!chatId && !!user?.id && !!otherUserId,
  });

  // Block user mutation
  const blockMutation = useMutation({
    mutationFn: async (reason?: string) => {
      if (!chatId || !user?.id || !otherUserId) {
        throw new Error('Missing required data to block user');
      }

      const { error } = await supabase
        .from('user_blocks')
        .insert({
          blocker_id: user.id,
          blocked_user_id: otherUserId,
          chat_id: chatId,
          reason: reason || null,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userBlock', chatId, user?.id, otherUserId] });
    },
  });

  // Unblock user mutation
  const unblockMutation = useMutation({
    mutationFn: async () => {
      if (!blockStatus?.id) {
        throw new Error('No block found to remove');
      }

      const { error } = await supabase
        .from('user_blocks')
        .delete()
        .eq('id', blockStatus.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userBlock', chatId, user?.id, otherUserId] });
    },
  });

  return {
    isBlocked: !!blockStatus,
    isBlockedByOther: !!blockedByOther,
    blockReason: blockStatus?.reason || null,
    isLoading,
    blockUser: (reason?: string) => blockMutation.mutateAsync(reason),
    unblockUser: () => unblockMutation.mutateAsync(),
    isBlocking: blockMutation.isPending,
    isUnblocking: unblockMutation.isPending,
  };
}
