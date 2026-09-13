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
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    placeholderData: (prev) => prev,
    queryFn: async (): Promise<boolean> => {
      if (!uid) return false;
      const { data: vp } = await supabase
        .from('verified_participants')
        .select('user_id')
        .eq('user_id', uid)
        .maybeSingle();
      if (vp) return true;
      const { data: wvp } = await supabase
        .from('wedium_verified_participants')
        .select('user_id')
        .eq('user_id', uid)
        .maybeSingle();
      if (wvp) return true;

      const { data: role } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', uid)
        .eq('role', 'admin')
        .maybeSingle();
      return !!role;
    },
  });

  // Once auth is resolved and user is unauthenticated, we're definitively not
  // verified — never flip back into a loading state (prevents pill flicker).
  const isLoading = authLoading
    ? true
    : !!uid && query.isPending && query.data === undefined;

  return {
    isVerified: !!query.data,
    isLoading,
    isAuthenticated: !!uid,
  };
}
