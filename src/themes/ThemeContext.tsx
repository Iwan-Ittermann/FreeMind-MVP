import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { ThemeName } from './types';

interface ThemeContextValue {
  theme: ThemeName;
}

const ThemeContext = createContext<ThemeContextValue>({ theme: 'classic' });

function detectTheme(): ThemeName {
  if (typeof window === 'undefined') return 'classic';
  const hostname = window.location.hostname;
  // freemind.city or *.freemind.city → city theme
  if (hostname === 'freemind.city' || hostname.endsWith('.freemind.city')) return 'city';
  // Dev override via query param
  const params = new URLSearchParams(window.location.search);
  if (params.get('theme') === 'city') return 'city';
  return 'classic';
}

export function FreeMindThemeProvider({ children }: { children: ReactNode }) {
  const value = useMemo<ThemeContextValue>(() => ({ theme: detectTheme() }), []);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useFreeMindTheme(): ThemeName {
  return useContext(ThemeContext).theme;
}
