import { useEffect, useSyncExternalStore } from 'react';
import { lifecycle } from '@/platform';

// Tema por dispositivo (no se sincroniza): sistema, claro u oscuro.

export type ThemePreference = 'system' | 'light' | 'dark';

const THEME_KEY = 'todo.theme';
const DARK_QUERY = '(prefers-color-scheme: dark)';
const listeners = new Set<() => void>();

function readPreference(): ThemePreference {
  try {
    const value = window.localStorage.getItem(THEME_KEY);
    if (value === 'light' || value === 'dark' || value === 'system') return value;
  } catch {
    // Sin almacenamiento: se usa el tema del sistema.
  }
  return 'system';
}

let current: ThemePreference = typeof window === 'undefined' ? 'system' : readPreference();

function resolvedTheme(preference: ThemePreference): 'light' | 'dark' {
  if (preference !== 'system') return preference;
  return window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light';
}

// Aplica la clase en <html> (tokens.css define los colores de cada tema).
export function applyTheme(preference: ThemePreference = current): void {
  const root = document.documentElement;
  root.classList.remove('light', 'dark');
  if (preference !== 'system') root.classList.add(preference);
  void lifecycle.setSystemBarsTheme(resolvedTheme(preference)).catch(() => undefined);
}

export function setThemePreference(preference: ThemePreference): void {
  current = preference;
  try {
    window.localStorage.setItem(THEME_KEY, preference);
  } catch {
    // Se aplica igual, aunque no se pueda recordar.
  }
  applyTheme(preference);
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useThemePreference(): ThemePreference {
  return useSyncExternalStore(
    subscribe,
    () => current,
    () => 'system',
  );
}

// Mantiene las barras del sistema acordes cuando el tema sigue al dispositivo.
export function useSystemThemeSync(): void {
  useEffect(() => {
    const media = window.matchMedia(DARK_QUERY);
    const onChange = () => {
      if (current === 'system') applyTheme('system');
    };
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);
}
