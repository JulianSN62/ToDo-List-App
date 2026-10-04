// Partes de la app que se cargan a demanda (pantallas y ventanas). Si una no se puede
// cargar, lo más probable es que se haya publicado una versión nueva y la pestaña tenga
// la anterior: se recarga la página, pero una sola vez por ventana de tiempo para no
// entrar en un bucle si el problema es otro.

export const CHUNK_RELOAD_WINDOW_MS = 30_000;

export function shouldReloadForChunkError(lastReloadAt: number | null, now: number): boolean {
  if (lastReloadAt === null || !Number.isFinite(lastReloadAt)) return true;
  return now - lastReloadAt > CHUNK_RELOAD_WINDOW_MS || now < lastReloadAt;
}

// Mensajes de Chromium, Firefox y Safari cuando falla un import() dinámico.
const CHUNK_ERROR_PATTERNS = [
  /failed to fetch dynamically imported module/i,
  /error loading dynamically imported module/i,
  /importing a module script failed/i,
  /unable to preload css/i,
];

export function isChunkLoadError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return CHUNK_ERROR_PATTERNS.some((pattern) => pattern.test(error.message));
}
