import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

// Grant admin role to current user (called after password verification)
export function useGrantAdminRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (password: string) => {
      const { data, error } = await supabase.rpc('grant_admin_role', {
        _password: password,
      });

      if (error) throw error;
      if (!data) throw new Error('Invalid password');
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
