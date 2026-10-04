import { Suspense, useEffect, useRef } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router';
import { errorMeta, logger } from '@/lib/logger';
import { lifecycle } from '@/platform';
import { es } from '@/i18n/es';
import { runBackHandler } from '@/ui/backStack';
import { MAIN_CONTENT_ID } from '@/ui/sheet';
import { useIsSidebarLayout } from '@/ui/useMediaQuery';
import { FolderFormSheet } from '../features/folders/FolderFormSheet';
import { SearchOverlay } from '../features/search/SearchOverlay';
import { CreateTaskSheet } from '../features/tasks/TaskFormSheet';
import { BottomNav } from './BottomNav';
import { preloadLazyComponents, whenIdle } from './lazyComponent';
import { Sidebar } from './Sidebar';
import { useUiStore } from './uiStore';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';

// Estructura general: barra inferior en mobile, barra lateral desde 768px.
// En desktop además hay atajos de teclado y la búsqueda como ventana flotante.
export function AppShell() {
  const isSidebarLayout = useIsSidebarLayout();
  useKeyboardShortcuts(isSidebarLayout);

  // La búsqueda flotante es solo de desktop: si la ventana se achica, se cierra.
  useEffect(() => {
    if (!isSidebarLayout) useUiStore.getState().setSearchOverlayOpen(false);
  }, [isSidebarLayout]);
  // Las pantallas y ventanas diferidas se cargan cuando el navegador está libre.
  useEffect(() => whenIdle(preloadLazyComponents), []);

  const navigate = useNavigate();
  const location = useLocation();
  const pathRef = useRef(location.pathname);

  useEffect(() => {
    pathRef.current = location.pathname;
  }, [location.pathname]);

  // Botón "atrás" de Android: cierra paneles -> sube de carpeta -> vuelve al inicio -> minimiza.
  useEffect(() => {
    return lifecycle.onBackButton(() => {
      if (runBackHandler()) return;
      if (pathRef.current !== '/') {
        navigate('/');
        return;
      }
      lifecycle.minimize().catch((error: unknown) => {
        logger.warn('No se pudo minimizar la app', errorMeta(error));
      });
    });
  }, [navigate]);

  return (
    <div className="flex h-dvh overflow-hidden bg-app">
      {/* Primer elemento con Tab: salta la navegación (teclado y lectores de pantalla). */}
      <a
        href={`#${MAIN_CONTENT_ID}`}
        onClick={(event) => {
          event.preventDefault();
          document.getElementById(MAIN_CONTENT_ID)?.focus();
        }}
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-sm focus:bg-panel focus:px-4 focus:py-3 focus:text-body-sm focus:font-medium focus:text-fg focus:elevation-md"
      >
        {es.nav.skipToContent}
      </a>
      {isSidebarLayout ? <Sidebar /> : null}
      <div className="flex min-w-0 flex-1 flex-col pr-safe">
        <main
          id={MAIN_CONTENT_ID}
          tabIndex={-1}
          className="flex min-h-0 flex-1 flex-col focus:outline-none"
        >
          {/* Solo se ve vacío la primera vez que se abre una pantalla diferida (un instante). */}
          <Suspense fallback={<div className="flex-1" />}>
            <Outlet />
          </Suspense>
        </main>
        {isSidebarLayout ? null : <BottomNav />}
      </div>
      <FolderFormSheet />
      <CreateTaskSheet />
      {isSidebarLayout ? <SearchOverlay /> : null}
    </div>
  );
}
