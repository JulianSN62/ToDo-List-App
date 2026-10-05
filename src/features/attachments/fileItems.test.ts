import { describe, expect, it } from 'vitest';
import type { TaskFile } from '@/data';
import type { FileDraft } from '@/lib/taskForm';
import { draftsToFileItems } from './fileItems';

const draft = (overrides: Partial<FileDraft> = {}): FileDraft => ({
  key: 'k1',
  id: 'a1',
  name: 'foto.jpg',
  mimeType: 'image/jpeg',
  size: 1000,
  data: null,
  ...overrides,
});

const saved: TaskFile = {
  id: 'a1',
  taskId: 't1',
  name: 'foto.jpg',
  mimeType: 'image/jpeg',
  size: 1000,
  position: 'a0',
  status: 'pending',
  cached: true,
};

describe('draftsToFileItems', () => {
  it('un archivo nuevo de la ventana queda como borrador', () => {
    const [item] = draftsToFileItems([draft({ id: null })], []);
    expect(item).toMatchObject({ status: 'draft', cached: false });
  });

  it('un archivo guardado toma el estado actual de la base', () => {
    const [item] = draftsToFileItems([draft()], [saved]);
    expect(item).toMatchObject({ status: 'pending', cached: true });
  });

  it('mientras la consulta no lo devuelve, no dice "En la nube"', () => {
    const [item] = draftsToFileItems([draft()], []);
    expect(item).toMatchObject({ status: 'loading', cached: false });
  });
});
