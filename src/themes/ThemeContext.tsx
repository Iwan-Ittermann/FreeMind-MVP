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

const THEME_CLASSES = ['theme-classic', 'theme-city', 'theme-arcane', 'theme-signal', 'theme-nebula'];

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

  useEffect(() => {
    const channel = supabase
      .channel(`theme-sync-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_settings' }, () => {
        queryClient.refetchQueries({ queryKey: ['appSetting', 'active_theme'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const resolvedFromSetting: ThemeName = !setting
    ? 'signal'
    : setting.value === 'city' ? 'city'
    : setting.value === 'arcane' ? 'arcane'
    : setting.value === 'signal' ? 'signal'
    : setting.value === 'nebula' ? 'nebula'
    : 'classic';

  // Helsinki event build defaults to nebula unless admin explicitly picked something else.
  const theme: ThemeName = !setting ? 'nebula' : resolvedFromSetting;

  // Apply theme class to <body> so CSS variable overrides (e.g. .theme-nebula) cascade.
  useEffect(() => {
    const body = document.body;
    THEME_CLASSES.forEach((c) => body.classList.remove(c));
    body.classList.add(`theme-${theme}`);
    return () => { body.classList.remove(`theme-${theme}`); };
  }, [theme]);

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
