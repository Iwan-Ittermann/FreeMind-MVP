import { createContext, useContext, useMemo, useEffect, useState, useCallback, type ReactNode } from 'react';
import { useAppSetting } from '@/hooks/useAppSettings';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import type { ThemeName } from './types';

interface ThemeContextValue {
  theme: ThemeName;
  hidePendingEdges: boolean;
  setHidePendingEdges: (v: boolean) => void;
}

const ThemeContext = createContext<ThemeContextValue>({ theme: 'classic', hidePendingEdges: false, setHidePendingEdges: () => {} });

export function FreeMindThemeProvider({ children }: { children: ReactNode }) {
  const { data: setting } = useAppSetting('active_theme');
  const queryClient = useQueryClient();

  const [hidePendingEdges, setHidePendingEdgesState] = useState(() => {
    try { const v = localStorage.getItem('hidePendingEdges'); return v === null ? true : v === 'true'; } catch { return true; }
  });

  const setHidePendingEdges = useCallback((v: boolean) => {
    setHidePendingEdgesState(v);
    try { localStorage.setItem('hidePendingEdges', String(v)); } catch {}
  }, []);

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

  // Default to 'signal' while loading to avoid flash (backend value is 'signal')
  const theme: ThemeName = !setting ? 'signal' : (setting.value === 'city') ? 'city' : (setting.value === 'arcane') ? 'arcane' : (setting.value === 'signal') ? 'signal' : 'classic';

  const value = useMemo<ThemeContextValue>(() => ({ theme, hidePendingEdges, setHidePendingEdges }), [theme, hidePendingEdges, setHidePendingEdges]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useFreeMindTheme(): ThemeName {
  return useContext(ThemeContext).theme;
}

export function useHidePendingEdges() {
  const ctx = useContext(ThemeContext);
  return [ctx.hidePendingEdges, ctx.setHidePendingEdges] as const;
}
