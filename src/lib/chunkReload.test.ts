import { describe, expect, it } from 'vitest';
import { CHUNK_RELOAD_WINDOW_MS, isChunkLoadError, shouldReloadForChunkError } from './chunkReload';

describe('shouldReloadForChunkError', () => {
  const now = 1_000_000;

  it('recarga si nunca se recargó', () => {
    expect(shouldReloadForChunkError(null, now)).toBe(true);
  });

  it('no recarga dos veces seguidas', () => {
    expect(shouldReloadForChunkError(now - 1_000, now)).toBe(false);
    expect(shouldReloadForChunkError(now - CHUNK_RELOAD_WINDOW_MS, now)).toBe(false);
  });

  it('vuelve a recargar pasada la ventana', () => {
    expect(shouldReloadForChunkError(now - CHUNK_RELOAD_WINDOW_MS - 1, now)).toBe(true);
  });

  it('ignora marcas inválidas o en el futuro', () => {
    expect(shouldReloadForChunkError(Number.NaN, now)).toBe(true);
    expect(shouldReloadForChunkError(now + 60_000, now)).toBe(true);
  });
});

describe('isChunkLoadError', () => {
  it('reconoce los mensajes de los navegadores', () => {
    expect(
      isChunkLoadError(
        new TypeError('Failed to fetch dynamically imported module: https://x/assets/a.js'),
      ),
    ).toBe(true);
    expect(isChunkLoadError(new TypeError('error loading dynamically imported module'))).toBe(true);
    expect(isChunkLoadError(new TypeError('Importing a module script failed.'))).toBe(true);
  });

  it('no confunde otros errores', () => {
    expect(isChunkLoadError(new Error('boom'))).toBe(false);
    expect(isChunkLoadError('Failed to fetch dynamically imported module')).toBe(false);
    expect(isChunkLoadError(null)).toBe(false);
  });
});
