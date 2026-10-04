import { useCallback, useSyncExternalStore } from 'react';

// Breakpoints del diseño: < 768 bottom nav, 768-1023 sidebar, >= 1024 tres columnas.
export const BREAKPOINTS = {
  sidebar: '(min-width: 768px)',
  desktop: '(min-width: 1024px)',
} as const;

// Una sola MediaQueryList por consulta: lo usan muchas filas a la vez (listas largas)
// y crear una por render es caro.
const lists = new Map<string, MediaQueryList>();

function mediaList(query: string): MediaQueryList {
  let list = lists.get(query);
  if (!list) {
    list = window.matchMedia(query);
    lists.set(query, list);
  }
  return list;
}

export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (callback: () => void) => {
      const media = mediaList(query);
      media.addEventListener('change', callback);
      return () => media.removeEventListener('change', callback);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => mediaList(query).matches,
    () => false,
  );
}

export function useIsSidebarLayout(): boolean {
  return useMediaQuery(BREAKPOINTS.sidebar);
}

export function useIsDesktopLayout(): boolean {
  return useMediaQuery(BREAKPOINTS.desktop);
}
