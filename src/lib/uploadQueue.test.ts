import { describe, expect, it } from 'vitest';
import {
  afterUploadAttempt,
  classifyUploadError,
  INITIAL_UPLOAD_STATE,
  isDue,
  msUntilNextAttempt,
  nextAttemptDelay,
  retryNow,
  type UploadState,
} from './uploadQueue';

const NOW = new Date('2026-10-03T12:00:00.000Z');
const later = (ms: number) => new Date(NOW.getTime() + ms).toISOString();

describe('cola de subida de archivos', () => {
  it('clasifica los errores de Storage', () => {
    expect(classifyUploadError(undefined)).toBe('transient');
    expect(classifyUploadError(null)).toBe('transient');
    expect(classifyUploadError(0)).toBe('transient');
    for (const status of [401, 408, 429, 500, 502, 503]) {
      expect(classifyUploadError(status), String(status)).toBe('transient');
    }
    for (const status of [400, 403, 404, 413, 415, 422]) {
      expect(classifyUploadError(status), String(status)).toBe('permanent');
    }
  });

  it('espera cada vez más entre intentos, con un tope', () => {
    expect([1, 2, 3, 4, 5, 6, 50].map(nextAttemptDelay)).toEqual([
      5_000, 15_000, 30_000, 60_000, 120_000, 120_000, 120_000,
    ]);
    expect(nextAttemptDelay(0)).toBe(5_000);
  });

  it('una subida correcta deja el archivo listo', () => {
    const state: UploadState = { ...INITIAL_UPLOAD_STATE, attempts: 3, lastError: '503' };
    expect(afterUploadAttempt(state, { ok: true }, { now: NOW, online: true })).toEqual({
      status: 'uploaded',
      attempts: 0,
      nextAttemptAt: null,
      lastError: null,
    });
  });

  it('un error permanente marca el archivo con error', () => {
    const result = afterUploadAttempt(
      INITIAL_UPLOAD_STATE,
      { ok: false, failure: { kind: 'permanent', code: '403' } },
      { now: NOW, online: true },
    );
    expect(result).toEqual({
      status: 'failed',
      attempts: 1,
      nextAttemptAt: null,
      lastError: '403',
    });
  });

  it('un error pasajero con conexión programa un reintento', () => {
    const first = afterUploadAttempt(
      INITIAL_UPLOAD_STATE,
      { ok: false, failure: { kind: 'transient', code: '503' } },
      { now: NOW, online: true },
    );
    expect(first).toEqual({
      status: 'pending',
      attempts: 1,
      nextAttemptAt: later(5_000),
      lastError: '503',
    });
    const second = afterUploadAttempt(
      first,
      { ok: false, failure: { kind: 'transient', code: 'network' } },
      { now: NOW, online: true },
    );
    expect(second.attempts).toBe(2);
    expect(second.nextAttemptAt).toBe(later(15_000));
  });

  it('sin conexión no cuenta el intento y espera a que vuelva la red', () => {
    const state: UploadState = { ...INITIAL_UPLOAD_STATE, attempts: 2 };
    expect(
      afterUploadAttempt(
        state,
        { ok: false, failure: { kind: 'transient', code: 'network' } },
        { now: NOW, online: false },
      ),
    ).toEqual({ status: 'pending', attempts: 2, nextAttemptAt: null, lastError: 'network' });
  });

  it('"Reintentar" vuelve a la cola para ya', () => {
    expect(retryNow()).toEqual(INITIAL_UPLOAD_STATE);
    expect(isDue(retryNow(), NOW)).toBe(true);
  });

  it('sabe cuáles toca subir y cuánto falta para el próximo', () => {
    expect(isDue({ status: 'pending', nextAttemptAt: null }, NOW)).toBe(true);
    expect(isDue({ status: 'pending', nextAttemptAt: later(-1) }, NOW)).toBe(true);
    expect(isDue({ status: 'pending', nextAttemptAt: later(1_000) }, NOW)).toBe(false);
    expect(isDue({ status: 'failed', nextAttemptAt: null }, NOW)).toBe(false);
    expect(isDue({ status: 'uploading', nextAttemptAt: null }, NOW)).toBe(false);

    expect(
      msUntilNextAttempt(
        [
          { status: 'pending', nextAttemptAt: later(30_000) },
          { status: 'pending', nextAttemptAt: later(5_000) },
          { status: 'failed', nextAttemptAt: later(1_000) },
          { status: 'pending', nextAttemptAt: null },
        ],
        NOW,
      ),
    ).toBe(5_000);
    expect(msUntilNextAttempt([{ status: 'uploaded', nextAttemptAt: null }], NOW)).toBeNull();
  });
});
