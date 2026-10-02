import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Task, TaskLink } from '@/data';
import { TaskForm } from './TaskForm';

const create = vi.fn<(input: unknown) => Promise<string>>();
const applyEdits = vi.fn<(id: string, edits: unknown) => Promise<void>>();
const showToast = vi.fn();

const folders = new Map([
  ['f1', { id: 'f1', parentId: null, name: 'Universidad' }],
  ['f2', { id: 'f2', parentId: null, name: 'Trabajo' }],
]);

const urgente = { id: 'tag-u', name: 'Urgente', color: 'red' as const };
const tags = [urgente];

vi.mock('@/data', () => ({
  taskRepo: {
    create: (input: unknown) => create(input),
    applyEdits: (id: string, edits: unknown) => applyEdits(id, edits),
  },
  useFolderTree: () => ({ byId: folders }),
  useTags: () => ({ tags, byId: new Map(tags.map((tag) => [tag.id, tag])), isLoading: false }),
}));

vi.mock('@/ui/toast', () => ({
  showErrorToast: vi.fn(),
  showToast: (message: string) => showToast(message),
  showUndoToast: vi.fn(),
}));

vi.mock('@/platform', () => ({
  platform: { isNative: false },
  externalLinks: { open: vi.fn() },
}));

// El selector real usa paneles responsive; acá alcanza con elegir "Trabajo".
vi.mock('../folders/FolderPickerSheet', () => ({
  FolderPickerSheet: ({
    open,
    onConfirm,
  }: {
    open: boolean;
    onConfirm: (folderId: string | null) => void;
  }) =>
    open ? (
      <button type="button" onClick={() => onConfirm('f2')}>
        Elegir Trabajo
      </button>
    ) : null,
}));

// Selector de etiquetas simplificado: marca "Urgente".
vi.mock('../tags/TagPickerSheet', () => ({
  TagPickerSheet: ({
    open,
    selectedIds,
    onChange,
  }: {
    open: boolean;
    selectedIds: string[];
    onChange: (tagIds: string[]) => void;
  }) =>
    open ? (
      <button type="button" onClick={() => onChange([...selectedIds, 'tag-u'])}>
        Elegir Urgente
      </button>
    ) : null,
}));

const TODAY = '2026-10-01';

const task: Task = {
  id: 't1',
  folderId: 'f1',
  title: 'Revisar contrato',
  description: null,
  dueDate: null,
  isPriority: false,
  color: null,
  position: 'a0',
  isDone: false,
  doneAt: null,
  isPinned: false,
  createdAt: null,
  updatedAt: null,
};

const savedLink: TaskLink = {
  id: 'l1',
  taskId: 't1',
  url: 'https://example.com/contrato',
  label: 'Contrato',
  position: 'a0',
};

function renderCreate() {
  const onClose = vi.fn();
  render(
    <TaskForm
      mode={{ kind: 'create', folderId: 'f1' }}
      today={TODAY}
      onClose={onClose}
      onCancel={vi.fn()}
    />,
  );
  return { onClose, title: screen.getByRole('textbox', { name: 'Título' }) };
}

describe('ventana de nueva tarea', () => {
  beforeEach(() => {
    create.mockReset();
    create.mockResolvedValue('id');
    applyEdits.mockReset();
    applyEdits.mockResolvedValue();
    showToast.mockReset();
  });

  it('"Crear" guarda todos los campos y cierra', async () => {
    const user = userEvent.setup();
    const { onClose, title } = renderCreate();

    await user.type(title, 'Comprar pan');
    await user.type(screen.getByRole('textbox', { name: 'Descripción' }), 'Integral');
    await user.click(screen.getByRole('button', { name: 'Crear' }));

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(create).toHaveBeenCalledWith({
      folderId: 'f1',
      title: 'Comprar pan',
      description: 'Integral',
      dueDate: null,
      isPriority: false,
      color: null,
      tagIds: [],
      links: [],
    });
  });

  it('crea con etiquetas y con el link escrito aunque no se toque "Listo"', async () => {
    const user = userEvent.setup();
    const { onClose, title } = renderCreate();

    await user.type(title, 'Preparar presupuesto');
    await user.click(screen.getByRole('button', { name: 'Agregar etiqueta' }));
    await user.click(screen.getByRole('button', { name: 'Elegir Urgente' }));
    expect(screen.getByText('Urgente')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Agregar link' }));
    await user.type(screen.getByRole('textbox', { name: 'Dirección' }), 'ejemplo.com/doc');
    await user.click(screen.getByRole('button', { name: 'Crear' }));

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Preparar presupuesto',
        tagIds: ['tag-u'],
        links: [{ url: 'https://ejemplo.com/doc', label: null }],
      }),
    );
  });

  it('no guarda si el link no es válido', async () => {
    const user = userEvent.setup();
    const { onClose, title } = renderCreate();

    await user.type(title, 'Tarea');
    await user.click(screen.getByRole('button', { name: 'Agregar link' }));
    await user.type(screen.getByRole('textbox', { name: 'Dirección' }), 'javascript:alert(1)');
    await user.click(screen.getByRole('button', { name: 'Crear' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Escribí una dirección válida');
    expect(create).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('"Crear y agregar otra" conserva las opciones y las etiquetas, y vacía los links', async () => {
    const user = userEvent.setup();
    const { onClose, title } = renderCreate();

    await user.click(screen.getByRole('switch', { name: 'Prioridad' }));
    await user.click(screen.getByRole('button', { name: 'Agregar etiqueta' }));
    await user.click(screen.getByRole('button', { name: 'Elegir Urgente' }));
    await user.click(screen.getByRole('button', { name: 'Agregar link' }));
    await user.type(screen.getByRole('textbox', { name: 'Dirección' }), 'ejemplo.com');
    await user.click(screen.getByRole('button', { name: 'Listo' }));
    expect(screen.getByRole('link', { name: /ejemplo\.com/ })).toBeInTheDocument();

    await user.type(title, 'Primera');
    await user.click(screen.getByRole('button', { name: 'Crear y agregar otra' }));

    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Primera',
        isPriority: true,
        tagIds: ['tag-u'],
        links: [{ url: 'https://ejemplo.com/', label: null }],
      }),
    );
    expect(title).toHaveValue('');
    expect(title).toHaveFocus();
    expect(screen.getByRole('switch', { name: 'Prioridad' })).toBeChecked();
    expect(screen.getByText('Urgente')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /ejemplo\.com/ })).not.toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Tarea creada'));
  });

  it('no pierde tareas al cargar varias seguidas mientras se guarda la anterior', async () => {
    let releaseFirst: (value: string) => void = () => undefined;
    create.mockImplementationOnce(() => new Promise<string>((resolve) => (releaseFirst = resolve)));
    const user = userEvent.setup();
    const { title } = renderCreate();
    const another = screen.getByRole('button', { name: 'Crear y agregar otra' });

    await user.type(title, 'Primera');
    await user.click(another);
    await user.type(title, 'Segunda');
    await user.click(another);
    releaseFirst('id1');

    await waitFor(() => expect(create).toHaveBeenCalledTimes(2));
    expect(create.mock.calls.map(([input]) => (input as { title: string }).title)).toEqual([
      'Primera',
      'Segunda',
    ]);
    expect(title).toHaveValue('');
  });

  it('pide el título y no crea tareas vacías', async () => {
    const user = userEvent.setup();
    const { title } = renderCreate();

    await user.type(title, '   ');
    await user.click(screen.getByRole('button', { name: 'Crear' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Escribí un título.');
    expect(create).not.toHaveBeenCalled();
  });

  it('Enter en el título crea la tarea', async () => {
    const user = userEvent.setup();
    const { onClose, title } = renderCreate();

    await user.type(title, 'Leche{Enter}');

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ title: 'Leche' }));
  });
});

describe('ventana de edición', () => {
  beforeEach(() => {
    applyEdits.mockReset();
    applyEdits.mockResolvedValue();
  });

  function renderEdit(extras: { tagIds?: string[]; links?: TaskLink[] } = {}) {
    const onClose = vi.fn();
    const onDirtyChange = vi.fn();
    render(
      <TaskForm
        mode={{ kind: 'edit', task, tagIds: extras.tagIds ?? [], links: extras.links ?? [] }}
        today={TODAY}
        onClose={onClose}
        onCancel={vi.fn()}
        onDirtyChange={onDirtyChange}
      />,
    );
    return { onClose, onDirtyChange };
  }

  it('muestra los datos guardados y guarda solo lo que cambió', async () => {
    const user = userEvent.setup();
    const { onClose, onDirtyChange } = renderEdit();

    expect(screen.getByRole('textbox', { name: 'Título' })).toHaveValue('Revisar contrato');
    expect(onDirtyChange).toHaveBeenLastCalledWith(false);

    await user.type(screen.getByRole('textbox', { name: 'Descripción' }), 'Cláusula 4');
    expect(onDirtyChange).toHaveBeenLastCalledWith(true);
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(applyEdits).toHaveBeenCalledWith('t1', {
      patch: { description: 'Cláusula 4' },
      folderId: null,
      tags: { add: [], remove: [] },
      links: { add: [], update: [], remove: [] },
    });
  });

  it('sin cambios, "Guardar" cierra sin escribir', async () => {
    const user = userEvent.setup();
    const { onClose } = renderEdit({ tagIds: ['tag-u'], links: [savedLink] });

    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(applyEdits).not.toHaveBeenCalled();
  });

  it('cambiar la carpeta mueve la tarea al guardar', async () => {
    const user = userEvent.setup();
    const { onClose } = renderEdit();

    expect(screen.getByText('Universidad')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cambiar' }));
    await user.click(screen.getByRole('button', { name: 'Elegir Trabajo' }));
    expect(screen.getByText('Trabajo')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(applyEdits).toHaveBeenCalledWith(
      't1',
      expect.objectContaining({ patch: {}, folderId: 'f2' }),
    );
  });

  it('quitar una etiqueta y un link se guarda junto con "Guardar"', async () => {
    const user = userEvent.setup();
    const { onClose, onDirtyChange } = renderEdit({ tagIds: ['tag-u'], links: [savedLink] });

    expect(screen.getByText('Urgente')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Contrato/ })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Quitar la etiqueta Urgente' }));
    await user.click(screen.getByRole('button', { name: 'Quitar el link Contrato' }));
    expect(onDirtyChange).toHaveBeenLastCalledWith(true);
    expect(applyEdits).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(applyEdits).toHaveBeenCalledWith('t1', {
      patch: {},
      folderId: null,
      tags: { add: [], remove: ['tag-u'] },
      links: { add: [], update: [], remove: ['l1'] },
    });
  });

  it('editar el texto de un link lo actualiza al guardar', async () => {
    const user = userEvent.setup();
    const { onClose } = renderEdit({ links: [savedLink] });

    await user.click(screen.getByRole('button', { name: 'Editar el link Contrato' }));
    const label = screen.getByRole('textbox', { name: 'Texto (opcional)' });
    await user.clear(label);
    await user.type(label, 'Contrato firmado{Enter}');
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(applyEdits).toHaveBeenCalledWith(
      't1',
      expect.objectContaining({
        links: {
          add: [],
          update: [{ id: 'l1', url: 'https://example.com/contrato', label: 'Contrato firmado' }],
          remove: [],
        },
      }),
    );
  });
});
