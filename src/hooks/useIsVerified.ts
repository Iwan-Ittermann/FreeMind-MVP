import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

/**
 * Returns true iff the current auth user is in public.verified_participants
 * or has the admin role. Unauthenticated users are never verified.
 */
export function useIsVerified() {
  const { user, loading: authLoading } = useAuth();
  const uid = user?.id ?? null;

  const query = useQuery({
    queryKey: ['is-verified', uid],
    enabled: !!uid,
    staleTime: 60_000,
    queryFn: async (): Promise<boolean> => {
      if (!uid) return false;
      const { data: vp } = await supabase
        .from('verified_participants')
        .select('user_id')
        .eq('user_id', uid)
        .maybeSingle();
      if (vp) return true;
      const { data: role } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', uid)
        .eq('role', 'admin')
        .maybeSingle();
      return !!role;
    },
  });

  return {
    isVerified: !!query.data,
    isLoading: authLoading || (!!uid && query.isLoading),
    isAuthenticated: !!uid,
  };
}
