import { createContext, useContext, useMemo, useEffect, useState, type ReactNode } from 'react';
import { useAppSetting } from '@/hooks/useAppSettings';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import type { ThemeName } from './types';

interface ThemeContextValue {
  theme: ThemeName;
}

const ThemeContext = createContext<ThemeContextValue>({ theme: 'classic' });

export function FreeMindThemeProvider({ children }: { children: ReactNode }) {
  const { data: setting } = useAppSetting('active_theme');
  const queryClient = useQueryClient();

  // Subscribe to realtime changes on app_settings
  useEffect(() => {
    const channel = supabase
      .channel(`theme-sync-${Date.now()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'app_settings' },
        () => {
          queryClient.refetchQueries({ queryKey: ['appSetting', 'active_theme'] });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const theme: ThemeName = (setting?.value === 'city') ? 'city' : 'classic';

  const value = useMemo<ThemeContextValue>(() => ({ theme }), [theme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useFreeMindTheme(): ThemeName {
  return useContext(ThemeContext).theme;
}
