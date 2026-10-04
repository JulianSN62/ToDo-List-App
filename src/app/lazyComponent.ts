import { lazy, type ComponentType } from 'react';
import { shouldReloadForChunkError } from '@/lib/chunkReload';
import { errorMeta, logger } from '@/lib/logger';

// Pantallas y ventanas que se cargan a demanda, para que el inicio de la app baje y
// procese menos código. Todo queda en el precache del service worker, así que funcionan
// sin conexión igual que el resto.

const RELOAD_KEY = 'todo.chunkReloadAt';

/**
 * Recarga la página una sola vez si falla la carga de una parte de la app (típico de
 * una pestaña abierta antes de publicar una versión nueva). Devuelve false si ya se
 * recargó hace poco o no se puede recordar (sin almacenamiento no hay protección
 * contra un bucle de recargas).
 */
export function reloadAfterChunkError(error: unknown): boolean {
  const now = Date.now();
  try {
    const raw = window.sessionStorage.getItem(RELOAD_KEY);
    if (!shouldReloadForChunkError(raw === null ? null : Number(raw), now)) return false;
    window.sessionStorage.setItem(RELOAD_KEY, String(now));
  } catch {
    return false;
  }
  logger.warn('No se pudo cargar una parte de la app: se recarga la página', errorMeta(error));
  window.location.reload();
  return true;
}

export type LazyComponent<P extends object> = ComponentType<P> & {
  /** Carga el código por adelantado (sin recargar la página si falla). */
  preload: () => Promise<void>;
};

// Lo que se carga apenas el navegador está libre, con la sesión abierta.
const idlePreloads = new Set<() => Promise<void>>();

export function preloadLazyComponents(): void {
  for (const preload of idlePreloads) void preload();
}

export function lazyComponent<P extends object>(
  load: () => Promise<ComponentType<P>>,
  { preloadWhenIdle = true }: { preloadWhenIdle?: boolean } = {},
): LazyComponent<P> {
  let pending: Promise<{ default: ComponentType<P> }> | null = null;
  const get = () => {
    pending ??= load().then(
      (component) => ({ default: component }),
      (error: unknown) => {
        pending = null;
        throw error;
      },
    );
    return pending;
  };
  const Component = lazy(() =>
    get().catch((error: unknown) => {
      // Mientras la página se recarga no se muestra nada.
      if (reloadAfterChunkError(error)) return new Promise<never>(() => undefined);
      throw error;
    }),
  );
  const preload = () =>
    get().then(
      () => undefined,
      () => undefined,
    );
  if (preloadWhenIdle) idlePreloads.add(preload);
  return Object.assign(Component, { preload });
}

/** Ejecuta la tarea cuando el navegador está libre (o en un segundo si no lo soporta). */
export function whenIdle(task: () => void): () => void {
  if (typeof window.requestIdleCallback === 'function') {
    const id = window.requestIdleCallback(task, { timeout: 5_000 });
    return () => window.cancelIdleCallback(id);
  }
  const id = window.setTimeout(task, 1_000);
  return () => window.clearTimeout(id);
}
