import { useEffect, useRef } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router';
import { lifecycle } from '@/platform';
import { runBackHandler } from '@/ui/backStack';
import { useIsSidebarLayout } from '@/ui/useMediaQuery';
import { FolderFormSheet } from '../features/folders/FolderFormSheet';
import { SearchOverlay } from '../features/search/SearchOverlay';
import { CreateTaskSheet } from '../features/tasks/TaskFormSheet';
import { BottomNav } from './BottomNav';
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
      void lifecycle.minimize();
    });
  }, [navigate]);

  return (
    <div className="flex h-dvh overflow-hidden bg-app">
      {isSidebarLayout ? <Sidebar /> : null}
      <div className="flex min-w-0 flex-1 flex-col pr-safe">
        <Outlet />
        {isSidebarLayout ? null : <BottomNav />}
      </div>
      <FolderFormSheet />
      <CreateTaskSheet />
      {isSidebarLayout ? <SearchOverlay /> : null}
    </div>
  );
}
