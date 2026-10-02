import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router';
import { isTypingTarget, matchShortcut, type ShortcutTarget } from '@/lib/shortcuts';
import { useUiStore } from './uiStore';

// Atajos de teclado globales (solo desktop): N hace lo mismo que el botón "+" de la
// pantalla; "/" y Ctrl+K abren la búsqueda. No actúan mientras se escribe ni con
// una ventana o menú abierto (ahí Esc y Enter los manejan los propios componentes).

const OPEN_OVERLAY_SELECTOR = ['dialog', 'alertdialog', 'menu']
  .map((role) => `[role="${role}"]:not([data-state="closed"])`)
  .join(', ');

function hasOpenOverlay(): boolean {
  return document.querySelector(OPEN_OVERLAY_SELECTOR) !== null;
}

export function useKeyboardShortcuts(enabled: boolean): void {
  const location = useLocation();
  const pathRef = useRef(location.pathname);

  useEffect(() => {
    pathRef.current = location.pathname;
  }, [location.pathname]);

  useEffect(() => {
    if (!enabled) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented) return;
      const action = matchShortcut(event, {
        typing: isTypingTarget(event.target as ShortcutTarget | null),
        overlayOpen: hasOpenOverlay(),
      });
      if (!action) return;

      const state = useUiStore.getState();
      if (action === 'newItem') {
        if (!state.newItemAction) return;
        event.preventDefault();
        state.newItemAction();
        return;
      }

      event.preventDefault();
      // En la pantalla Buscar ya hay un campo: se enfoca en vez de abrir la ventana.
      if (pathRef.current === '/search') {
        document.querySelector<HTMLInputElement>('[role="search"] input')?.focus();
        return;
      }
      state.setSearchOverlayOpen(true);
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enabled]);
}
