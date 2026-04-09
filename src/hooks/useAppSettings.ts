import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AppSetting {
  id: string;
  key: string;
  value: string;
  created_at: string;
  updated_at: string;
}

export function useAppSetting(key: string) {
  return useQuery({
    queryKey: ['appSetting', key],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_settings')
        .select('*')
        .eq('key', key)
        .single();

      if (error) {
        // Return null if not found
        if (error.code === 'PGRST116') return null;
        throw error;
      }
      return data as AppSetting;
    },
  });
}

export function useSiteTitle() {
  return useAppSetting('site_title');
}

export function useUpdateAppSetting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      // Try update first
      const { data, error: updateError } = await supabase
        .from('app_settings')
        .update({ value })
        .eq('key', key)
        .select();

      if (updateError) throw updateError;

      // If no rows updated, insert instead
      if (!data || data.length === 0) {
        const { error: insertError } = await supabase
          .from('app_settings')
          .insert({ key, value });

        if (insertError) throw insertError;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['appSetting', variables.key] });
    },
  });
}
