import { describe, expect, it } from 'vitest';
import { newId, taskTagId } from './ids';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe('ids', () => {
  it('genera UUID aleatorios', () => {
    expect(newId()).toMatch(UUID_PATTERN);
    expect(newId()).not.toBe(newId());
  });

  it('el id de tarea-etiqueta es siempre el mismo para el mismo par', async () => {
    const first = await taskTagId('task-1', 'tag-1');
    expect(first).toMatch(UUID_PATTERN);
    expect(await taskTagId('task-1', 'tag-1')).toBe(first);
    expect(await taskTagId('task-1', 'tag-2')).not.toBe(first);
    expect(await taskTagId('tag-1', 'task-1')).not.toBe(first);
  });

  it('tiene formato de UUID versión 8 con variante RFC', async () => {
    const id = await taskTagId('a', 'b');
    expect(id[14]).toBe('8');
    expect(['8', '9', 'a', 'b']).toContain(id[19]);
  });
});
