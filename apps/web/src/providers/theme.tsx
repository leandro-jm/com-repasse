import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { hexToHslString } from '@/lib/utils';

type Mode = 'light' | 'dark';
const KEY = 'crm-theme';

const ThemeCtx = createContext<{
  mode: Mode;
  toggle: () => void;
  setBrandColor: (hex: string | null) => void;
}>({ mode: 'light', toggle: () => {}, setBrandColor: () => {} });

export function useTheme() {
  return useContext(ThemeCtx);
}

function initialMode(): Mode {
  const saved = localStorage.getItem(KEY) as Mode | null;
  if (saved) return saved;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<Mode>(initialMode);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', mode === 'dark');
    root.classList.toggle('light', mode === 'light');
    localStorage.setItem(KEY, mode);
  }, [mode]);

  const toggle = useCallback(() => setMode((m) => (m === 'dark' ? 'light' : 'dark')), []);

  // White-label: sobrescreve --primary/--ring com a cor do tenant (RF12.2)
  const setBrandColor = useCallback((hex: string | null) => {
    const root = document.documentElement;
    if (!hex) {
      root.style.removeProperty('--primary');
      root.style.removeProperty('--ring');
      return;
    }
    const hsl = hexToHslString(hex);
    if (hsl) {
      root.style.setProperty('--primary', hsl);
      root.style.setProperty('--ring', hsl);
    }
  }, []);

  return (
    <ThemeCtx.Provider value={{ mode, toggle, setBrandColor }}>{children}</ThemeCtx.Provider>
  );
}
