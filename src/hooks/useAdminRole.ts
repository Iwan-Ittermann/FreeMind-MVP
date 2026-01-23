import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

// Grant admin role to current user (called after password verification via edge function)
export function useGrantAdminRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (password: string) => {
      // Use edge function for password verification instead of database RPC
      // This keeps the password server-side only
      const { data, error } = await supabase.functions.invoke('verify-admin-password', {
        body: { password },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Invalid password');
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-role'] });
    },
  });
}

// Check if current user has admin role
export function useIsAdmin() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-role', user?.id],
    queryFn: async () => {
      if (!user?.id) return false;

      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (error) return false;
      return !!data;
    },
    enabled: !!user?.id,
  });
}
