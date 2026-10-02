import { describe, expect, it, vi } from 'vitest';
import {
  chunk,
  runCleanup,
  STORAGE_BATCH_SIZE,
  toCounts,
  toStoragePaths,
  type CleanupDeps,
} from '../functions/cleanup/cleanup.ts';

const NOW = new Date('2026-10-02T06:30:00Z');

function deps(overrides: Partial<CleanupDeps> = {}) {
  const calls: string[] = [];
  const base: CleanupDeps = {
    storagePaths: vi.fn(async () => {
      calls.push('paths');
      return [];
    }),
    removeFiles: vi.fn(async () => {
      calls.push('remove');
    }),
    purge: vi.fn(async () => {
      calls.push('purge');
      return { tasks: 2, folders: 1, tags: 0, attachments: 3, reminders: 0, reminderTimes: 4 };
    }),
  };
  return { deps: { ...base, ...overrides }, calls };
}

describe('limpieza diaria (Edge Function)', () => {
  it('borra los archivos antes que las filas y usa el mismo instante', async () => {
    const { deps: d, calls } = deps({
      storagePaths: vi.fn(async () => {
        calls.push('paths');
        return ['u1/t1/a1-foto.jpg'];
      }),
    });
    const result = await runCleanup(d, NOW);
    expect(calls).toEqual(['paths', 'remove', 'purge']);
    expect(d.storagePaths).toHaveBeenCalledWith(NOW.toISOString());
    expect(d.purge).toHaveBeenCalledWith(NOW.toISOString());
    expect(result).toEqual({
      files: 1,
      tasks: 2,
      folders: 1,
      tags: 0,
      attachments: 3,
      reminders: 0,
      reminderTimes: 4,
    });
  });

  it('sin archivos no llama a Storage', async () => {
    const { deps: d, calls } = deps();
    await runCleanup(d, NOW);
    expect(calls).toEqual(['paths', 'purge']);
    expect(d.removeFiles).not.toHaveBeenCalled();
  });

  it('borra los archivos en tandas', async () => {
    const paths = Array.from({ length: STORAGE_BATCH_SIZE * 2 + 5 }, (_, i) => `u/t/${i}.pdf`);
    const { deps: d } = deps({ storagePaths: vi.fn(async () => paths) });
    const result = await runCleanup(d, NOW);
    expect(d.removeFiles).toHaveBeenCalledTimes(3);
    expect(vi.mocked(d.removeFiles).mock.calls[2]?.[0]).toHaveLength(5);
    expect(result.files).toBe(paths.length);
  });

  it('si falla Storage no borra ninguna fila', async () => {
    const { deps: d } = deps({
      storagePaths: vi.fn(async () => ['u/t/a.pdf']),
      removeFiles: vi.fn(async () => {
        throw new Error('Storage remove falló');
      }),
    });
    await expect(runCleanup(d, NOW)).rejects.toThrow('Storage remove falló');
    expect(d.purge).not.toHaveBeenCalled();
  });

  it('valida lo que devuelve la base', () => {
    expect(toStoragePaths(null)).toEqual([]);
    expect(toStoragePaths(['a', 'a', '', 3, 'b'])).toEqual(['a', 'b']);
    expect(toCounts({ tasks: 1, folders: 'x' })).toEqual({
      tasks: 1,
      folders: 0,
      tags: 0,
      attachments: 0,
      reminders: 0,
      reminderTimes: 0,
    });
    expect(chunk([1, 2, 3], 2)).toEqual([[1, 2], [3]]);
  });
});
