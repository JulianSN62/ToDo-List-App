import { describe, expect, it } from 'vitest';
import {
  applyLinkDraft,
  diffTaskForm,
  emptyTaskForm,
  filesToCreate,
  hasTaskFormChanges,
  isLinkDraftDirty,
  isTaskFormDirty,
  linksToCreate,
  taskToForm,
  validateTaskForm,
  type TaskFormValues,
} from './taskForm';
import { LIMITS } from './validation';

const saved: TaskFormValues = taskToForm({
  folderId: 'f1',
  title: 'Revisar contrato',
  description: null,
  dueDate: '2026-10-03',
  isPriority: false,
  color: 'blue',
});

const withExtras: TaskFormValues = taskToForm(
  {
    folderId: 'f1',
    title: 'Revisar contrato',
    description: null,
    dueDate: null,
    isPriority: false,
    color: null,
  },
  {
    tagIds: ['tag-a', 'tag-b'],
    links: [
      { id: 'l1', url: 'https://example.com/', label: 'Contrato' },
      { id: 'l2', url: 'https://docs.example.com/', label: null },
    ],
  },
);

const noTagOrLinkChanges = {
  tags: { add: [], remove: [] },
  links: { add: [], update: [], remove: [] },
  files: { add: [], remove: [] },
};

describe('formulario de tarea', () => {
  it('arranca vacío en la carpeta indicada', () => {
    expect(emptyTaskForm('f1')).toEqual({
      folderId: 'f1',
      title: '',
      description: '',
      dueDate: null,
      isPriority: false,
      color: null,
      tagIds: [],
      links: [],
      files: [],
    });
  });

  it('convierte la descripción nula en texto vacío', () => {
    expect(saved.description).toBe('');
  });

  it('carga etiquetas y links guardados', () => {
    expect(withExtras.tagIds).toEqual(['tag-a', 'tag-b']);
    expect(withExtras.links).toEqual([
      { key: 'l1', id: 'l1', url: 'https://example.com/', label: 'Contrato' },
      { key: 'l2', id: 'l2', url: 'https://docs.example.com/', label: '' },
    ]);
  });

  it('solo exige el título', () => {
    expect(validateTaskForm(emptyTaskForm('f1'))).toBe('titleRequired');
    expect(validateTaskForm({ ...emptyTaskForm('f1'), title: '   ' })).toBe('titleRequired');
    expect(validateTaskForm({ ...emptyTaskForm('f1'), title: 'Comprar pan' })).toBeNull();
    expect(
      validateTaskForm({ ...emptyTaskForm('f1'), title: 'a'.repeat(LIMITS.taskTitle + 1) }),
    ).toBe('titleTooLong');
  });

  it('el diff incluye solo los campos que cambiaron', () => {
    expect(diffTaskForm(saved, { ...saved, description: 'Ver la cláusula 4' })).toEqual({
      patch: { description: 'Ver la cláusula 4' },
      folderId: null,
      ...noTagOrLinkChanges,
    });
    expect(diffTaskForm(saved, { ...saved, isPriority: true, color: null })).toEqual({
      patch: { isPriority: true, color: null },
      folderId: null,
      ...noTagOrLinkChanges,
    });
  });

  it('normaliza título y descripción antes de comparar', () => {
    expect(diffTaskForm(saved, { ...saved, title: '  Revisar contrato  ' }).patch).toEqual({});
    expect(diffTaskForm(saved, { ...saved, description: '   ' }).patch).toEqual({});
    expect(
      diffTaskForm({ ...saved, description: 'Algo' }, { ...saved, description: '' }).patch,
    ).toEqual({ description: null });
  });

  it('informa la carpeta nueva por separado', () => {
    expect(diffTaskForm(saved, { ...saved, folderId: 'f2' })).toEqual({
      patch: {},
      folderId: 'f2',
      ...noTagOrLinkChanges,
    });
  });

  it('calcula qué etiquetas agregar y quitar', () => {
    const changes = diffTaskForm(withExtras, { ...withExtras, tagIds: ['tag-b', 'tag-c'] });
    expect(changes.tags).toEqual({ add: ['tag-c'], remove: ['tag-a'] });
    expect(hasTaskFormChanges(changes)).toBe(true);
    // El orden no importa
    expect(diffTaskForm(withExtras, { ...withExtras, tagIds: ['tag-b', 'tag-a'] }).tags).toEqual({
      add: [],
      remove: [],
    });
  });

  it('calcula qué links agregar, modificar y quitar', () => {
    const changes = diffTaskForm(withExtras, {
      ...withExtras,
      links: [
        { key: 'l1', id: 'l1', url: 'https://example.com/', label: 'Contrato firmado' },
        { key: 'nuevo', id: null, url: 'https://nuevo.com/', label: '  ' },
      ],
    });
    expect(changes.links).toEqual({
      add: [{ url: 'https://nuevo.com/', label: null }],
      update: [{ id: 'l1', url: 'https://example.com/', label: 'Contrato firmado' }],
      remove: ['l2'],
    });
  });

  it('sin cambios no hay nada para guardar', () => {
    expect(hasTaskFormChanges(diffTaskForm(withExtras, withExtras))).toBe(false);
  });

  it('prepara los links de una tarea nueva', () => {
    expect(
      linksToCreate([
        { key: 'a', id: null, url: 'https://a.com/', label: ' A ' },
        { key: 'b', id: null, url: 'https://b.com/', label: '' },
      ]),
    ).toEqual([
      { url: 'https://a.com/', label: 'A' },
      { url: 'https://b.com/', label: null },
    ]);
  });

  it('detecta cambios sin guardar', () => {
    expect(isTaskFormDirty(saved, saved)).toBe(false);
    expect(isTaskFormDirty(saved, { ...saved, title: 'Revisar contrato ' })).toBe(false);
    expect(isTaskFormDirty(saved, { ...saved, title: '' })).toBe(true);
    expect(isTaskFormDirty(saved, { ...saved, dueDate: null })).toBe(true);
    expect(isTaskFormDirty(saved, { ...saved, folderId: 'f2' })).toBe(true);
  });

  it('detecta cambios sin guardar en etiquetas y links', () => {
    expect(isTaskFormDirty(withExtras, { ...withExtras, tagIds: ['tag-b', 'tag-a'] })).toBe(false);
    expect(isTaskFormDirty(withExtras, { ...withExtras, tagIds: ['tag-a'] })).toBe(true);
    expect(isTaskFormDirty(withExtras, { ...withExtras, links: withExtras.links.slice(1) })).toBe(
      true,
    );
    const relabeled = withExtras.links.map((link) =>
      link.id === 'l2' ? { ...link, label: 'Docs' } : link,
    );
    expect(isTaskFormDirty(withExtras, { ...withExtras, links: relabeled })).toBe(true);
  });

  it('incorpora el link que se está escribiendo', () => {
    const links = withExtras.links;
    const key = () => 'nuevo';
    expect(applyLinkDraft(links, { key: null, url: '', label: ' ' }, key)).toEqual(links);
    expect(applyLinkDraft(links, { key: null, url: 'no es un link', label: '' }, key)).toBeNull();
    expect(
      applyLinkDraft(links, { key: null, url: 'ejemplo.com', label: 'Ej' }, key)?.at(-1),
    ).toEqual({ key: 'nuevo', id: null, url: 'https://ejemplo.com/', label: 'Ej' });
    expect(
      applyLinkDraft(links, { key: 'l2', url: 'https://otro.com', label: '' }, key)?.[1],
    ).toEqual({ key: 'l2', id: 'l2', url: 'https://otro.com/', label: '' });
  });

  it('detecta si el link en edición tiene cambios', () => {
    const links = withExtras.links;
    expect(isLinkDraftDirty(links, null)).toBe(false);
    expect(isLinkDraftDirty(links, { key: null, url: ' ', label: '' })).toBe(false);
    expect(isLinkDraftDirty(links, { key: null, url: 'a.com', label: '' })).toBe(true);
    expect(
      isLinkDraftDirty(links, { key: 'l1', url: 'https://example.com/', label: 'Contrato' }),
    ).toBe(false);
    expect(isLinkDraftDirty(links, { key: 'l1', url: 'https://example.com/', label: 'X' })).toBe(
      true,
    );
  });

  it('carga los archivos guardados y calcula cuáles agregar y quitar', () => {
    const initial = taskToForm(
      {
        folderId: 'f1',
        title: 'Con archivos',
        description: null,
        dueDate: null,
        isPriority: false,
        color: null,
      },
      {
        tagIds: [],
        links: [],
        files: [
          { id: 'a1', name: 'foto.jpg', mimeType: 'image/jpeg', size: 100 },
          { id: 'a2', name: 'doc.pdf', mimeType: 'application/pdf', size: 200 },
        ],
      },
    );
    expect(initial.files.map((file) => [file.key, file.id, file.data])).toEqual([
      ['a1', 'a1', null],
      ['a2', 'a2', null],
    ]);
    expect(isTaskFormDirty(initial, initial)).toBe(false);

    const data = new Blob(['hola']);
    const current: TaskFormValues = {
      ...initial,
      files: [
        initial.files[1]!,
        { key: 'k1', id: null, name: 'nota.txt', mimeType: 'text/plain', size: 4, data },
      ],
    };
    const changes = diffTaskForm(initial, current);
    expect(changes.files).toEqual({
      add: [{ name: 'nota.txt', mimeType: 'text/plain', size: 4, data }],
      remove: ['a1'],
    });
    expect(hasTaskFormChanges(changes)).toBe(true);
    expect(isTaskFormDirty(initial, current)).toBe(true);
    expect(filesToCreate(current.files)).toEqual(changes.files.add);
  });

  it('quitar un archivo deja cambios sin guardar', () => {
    const initial = taskToForm(
      {
        folderId: 'f1',
        title: 'Con archivo',
        description: null,
        dueDate: null,
        isPriority: false,
        color: null,
      },
      {
        tagIds: [],
        links: [],
        files: [{ id: 'a1', name: 'x.pdf', mimeType: 'application/pdf', size: 1 }],
      },
    );
    const current = { ...initial, files: [] };
    expect(isTaskFormDirty(initial, current)).toBe(true);
    expect(diffTaskForm(initial, current).files).toEqual({ add: [], remove: ['a1'] });
  });
});
