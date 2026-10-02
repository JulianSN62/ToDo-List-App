import { useCallback, useSyncExternalStore } from 'react';

// Breakpoints del diseño: < 768 bottom nav, 768-1023 sidebar, >= 1024 tres columnas.
export const BREAKPOINTS = {
  sidebar: '(min-width: 768px)',
  desktop: '(min-width: 1024px)',
} as const;

export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (callback: () => void) => {
      const media = window.matchMedia(query);
      media.addEventListener('change', callback);
      return () => media.removeEventListener('change', callback);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}

export function useIsSidebarLayout(): boolean {
  return useMediaQuery(BREAKPOINTS.sidebar);
}

export function useIsDesktopLayout(): boolean {
  return useMediaQuery(BREAKPOINTS.desktop);
}
