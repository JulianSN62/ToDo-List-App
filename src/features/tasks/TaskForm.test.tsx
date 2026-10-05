import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Reminder, Task, TaskFile, TaskLink } from '@/data';
import type { PickedFile } from '@/platform';
import { TaskForm } from './TaskForm';

const create = vi.fn<(input: unknown) => Promise<string>>();
const applyEdits = vi.fn<(id: string, edits: unknown) => Promise<void>>();
const showToast = vi.fn();
const pickFiles = vi.fn<() => Promise<PickedFile[]>>();
const retryUpload = vi.fn(async (_id: string) => undefined);
let savedFiles: TaskFile[] = [];

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
  useTaskFiles: () => ({ files: savedFiles, isLoading: false }),
  useOnline: () => true,
  fileRepo: {
    getFile: vi.fn(async () => new Blob()),
    readLocal: vi.fn(async () => null),
    retryUpload: (id: string) => retryUpload(id),
  },
  wakeFileSync: vi.fn(),
  wakeNotificationSync: vi.fn(),
  FileFetchError: class FileFetchError extends Error {},
}));

vi.mock('@/ui/toast', () => ({
  showErrorToast: vi.fn(),
  showToast: (message: string) => showToast(message),
  showUndoToast: vi.fn(),
}));

vi.mock('@/platform', () => ({
  platform: { isNative: false },
  externalLinks: { open: vi.fn() },
  files: { pickFiles: () => pickFiles(), openPdf: vi.fn(), saveFile: vi.fn() },
  // Sin compresión: los archivos se adjuntan tal cual.
  images: { compress: vi.fn(async () => null) },
  // En web no hay notificaciones: los recordatorios se editan igual.
  notifications: { isSupported: () => false },
}));

function picked(name: string, mimeType: string, size: number): PickedFile {
  return { name, mimeType, size, data: new Blob([new Uint8Array(Math.min(size, 16))]) };
}

// Los paneles reales son responsive (bottom sheet / modal); acá alcanza con su contenido.
vi.mock('@/ui/sheet', () => ({
  Sheet: ({
    open,
    title,
    children,
    footer,
  }: {
    open: boolean;
    title: string;
    children: ReactNode;
    footer?: ReactNode;
  }) =>
    open ? (
      <div role="dialog" aria-label={title}>
        {children}
        {footer}
      </div>
    ) : null,
  SheetBody: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SheetFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

// El visor de fotos usa paneles responsive; no hace falta en estas pruebas.
vi.mock('../attachments/ImageViewer', () => ({ ImageViewer: () => null }));

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
    { wrapper: MemoryRouter },
  );
  return { onClose, title: screen.getByRole('textbox', { name: 'Título' }) };
}

function renderEdit(
  extras: {
    tagIds?: string[];
    links?: TaskLink[];
    files?: TaskFile[];
    reminders?: Reminder[];
    task?: Task;
  } = {},
) {
  const onClose = vi.fn();
  const onDirtyChange = vi.fn();
  savedFiles = extras.files ?? [];
  render(
    <TaskForm
      mode={{
        kind: 'edit',
        task: extras.task ?? task,
        tagIds: extras.tagIds ?? [],
        links: extras.links ?? [],
        files: savedFiles,
        reminders: extras.reminders ?? [],
      }}
      today={TODAY}
      onClose={onClose}
      onCancel={vi.fn()}
      onDirtyChange={onDirtyChange}
    />,
    { wrapper: MemoryRouter },
  );
  return { onClose, onDirtyChange };
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
      files: [],
      isPinned: false,
      reminders: [],
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
      files: { add: [], remove: [] },
      reminders: { add: [], update: [], remove: [] },
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
      files: { add: [], remove: [] },
      reminders: { add: [], update: [], remove: [] },
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

// Instante local en el futuro lejano (las fechas pasadas no se aceptan).
const future = (day: number, hours: number, minutes = 0) =>
  new Date(2099, 0, day, hours, minutes).toISOString();

function setRow(index: number, date: string, time: string) {
  fireEvent.change(screen.getByLabelText(`Fecha ${index}`), { target: { value: date } });
  fireEvent.change(screen.getByLabelText(`Hora ${index}`), { target: { value: time } });
}

describe('recordatorios y anclado en la ventana', () => {
  beforeEach(() => {
    create.mockReset();
    create.mockResolvedValue('id');
    applyEdits.mockReset();
    applyEdits.mockResolvedValue();
  });

  it('crea la tarea anclada y con un recordatorio de dos fechas', async () => {
    const user = userEvent.setup();
    const { onClose, title } = renderCreate();

    await user.type(title, 'Pagar luz');
    await user.click(screen.getByRole('button', { name: 'Agregar recordatorio' }));
    const sheet = await screen.findByRole('dialog', { name: 'Nuevo recordatorio' });
    await user.type(within(sheet).getByLabelText('Mensaje (opcional)'), 'Antes del 10');
    setRow(1, '2099-01-10', '09:00');
    await user.click(within(sheet).getByRole('button', { name: 'Agregar otra fecha' }));
    setRow(2, '2099-01-11', '18:30');
    await user.click(within(sheet).getByRole('button', { name: 'Listo' }));

    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Nuevo recordatorio' })).not.toBeInTheDocument(),
    );
    expect(screen.getByText('Antes del 10')).toBeInTheDocument();
    expect(
      screen.getByText('Los avisos llegan en la app de Android: se programan cuando la abrís.'),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('switch', { name: 'Anclar tarea' }));
    await user.click(screen.getByRole('button', { name: 'Crear' }));

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Pagar luz',
        isPinned: true,
        reminders: [{ message: 'Antes del 10', fireAts: [future(10, 9), future(11, 18, 30)] }],
      }),
    );
  });

  it('no acepta fechas pasadas', async () => {
    const user = userEvent.setup();
    renderCreate();

    await user.click(screen.getByRole('button', { name: 'Agregar recordatorio' }));
    const sheet = await screen.findByRole('dialog', { name: 'Nuevo recordatorio' });
    setRow(1, '2001-05-01', '09:00');
    await user.click(within(sheet).getByRole('button', { name: 'Listo' }));

    expect(await within(sheet).findByText('Esa fecha y hora ya pasaron.')).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Nuevo recordatorio' })).toBeInTheDocument();
  });

  it('editar y quitar recordatorios se guarda con "Guardar"', async () => {
    const user = userEvent.setup();
    const reminders: Reminder[] = [
      {
        id: 'r1',
        taskId: 't1',
        message: null,
        times: [{ id: 'rt1', fireAt: future(10, 9) }],
      },
      {
        id: 'r2',
        taskId: 't1',
        message: 'Llamar',
        times: [{ id: 'rt2', fireAt: future(12, 8) }],
      },
    ];
    const { onClose } = renderEdit({ reminders });

    await user.click(
      screen.getByRole('button', { name: 'Editar el recordatorio "Revisar contrato"' }),
    );
    const sheet = await screen.findByRole('dialog', { name: 'Editar recordatorio' });
    await user.click(within(sheet).getByRole('button', { name: 'Agregar otra fecha' }));
    setRow(2, '2099-01-15', '10:00');
    await user.click(within(sheet).getByRole('button', { name: 'Listo' }));
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Editar recordatorio' })).not.toBeInTheDocument(),
    );
    await user.click(screen.getByRole('button', { name: 'Quitar el recordatorio "Llamar"' }));
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(applyEdits).toHaveBeenCalledWith(
      't1',
      expect.objectContaining({
        reminders: {
          add: [],
          update: [{ id: 'r1', addFireAts: [future(15, 10)], removeTimeIds: [] }],
          remove: ['r2'],
        },
      }),
    );
  });

  it('una tarea completada no se puede anclar', () => {
    renderEdit({ task: { ...task, isDone: true, isPinned: true } });
    expect(screen.getByRole('switch', { name: 'Anclar tarea' })).toBeDisabled();
    expect(screen.getByRole('switch', { name: 'Anclar tarea' })).not.toBeChecked();
  });
});

describe('archivos en la ventana', () => {
  beforeEach(() => {
    create.mockReset();
    create.mockResolvedValue('id');
    applyEdits.mockReset();
    applyEdits.mockResolvedValue();
    pickFiles.mockReset();
    retryUpload.mockClear();
    savedFiles = [];
  });

  const savedFile = (overrides: Partial<TaskFile> = {}): TaskFile => ({
    id: 'a1',
    taskId: 't1',
    name: 'presupuesto.pdf',
    mimeType: 'application/pdf',
    size: 2048,
    position: 'a1',
    status: 'uploaded',
    cached: true,
    ...overrides,
  });

  it('adjunta los archivos elegidos al crear y avisa los que superan 10 MB', async () => {
    const user = userEvent.setup();
    const { onClose, title } = renderCreate();
    pickFiles.mockResolvedValue([
      picked('informe.pdf', 'application/pdf', 2000),
      picked('fotos.zip', 'application/zip', 11 * 1024 * 1024),
    ]);

    await user.click(screen.getByRole('button', { name: 'Adjuntar archivos' }));

    expect(await screen.findByRole('button', { name: 'Abrir informe.pdf' })).toBeInTheDocument();
    expect(screen.getByText('Se adjunta al guardar')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(
      '«fotos.zip» pesa 11 MB. El límite es 10 MB por archivo.',
    );
    expect(screen.queryByRole('button', { name: 'Abrir fotos.zip' })).not.toBeInTheDocument();

    await user.type(title, 'Entregar informe');
    await user.click(screen.getByRole('button', { name: 'Crear' }));

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        files: [
          { name: 'informe.pdf', mimeType: 'application/pdf', size: 2000, data: expect.any(Blob) },
        ],
      }),
    );
  });

  it('quitar un archivo nuevo antes de guardar no lo adjunta', async () => {
    const user = userEvent.setup();
    const { title } = renderCreate();
    pickFiles.mockResolvedValue([picked('nota.txt', 'text/plain', 10)]);

    await user.click(screen.getByRole('button', { name: 'Adjuntar archivos' }));
    await user.click(await screen.findByRole('button', { name: 'Quitar el archivo nota.txt' }));
    await user.type(title, 'Sin archivos');
    await user.click(screen.getByRole('button', { name: 'Crear' }));

    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ files: [] }));
  });

  it('quitar un archivo guardado se aplica al tocar "Guardar"', async () => {
    const user = userEvent.setup();
    const { onClose, onDirtyChange } = renderEdit({ files: [savedFile()] });

    expect(screen.getByRole('button', { name: 'Abrir presupuesto.pdf' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Quitar el archivo presupuesto.pdf' }));
    expect(onDirtyChange).toHaveBeenLastCalledWith(true);
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(applyEdits).toHaveBeenCalledWith(
      't1',
      expect.objectContaining({ files: { add: [], remove: ['a1'] } }),
    );
  });

  it('muestra el estado de la subida y permite reintentar', async () => {
    const user = userEvent.setup();
    renderEdit({
      files: [
        savedFile({ id: 'a1', name: 'uno.pdf', status: 'pending' }),
        savedFile({ id: 'a2', name: 'dos.pdf', status: 'failed' }),
      ],
    });

    expect(screen.getByText('Pendiente de subir')).toBeInTheDocument();
    expect(screen.getByText('No se pudo subir')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Reintentar la subida de dos.pdf' }));
    expect(retryUpload).toHaveBeenCalledWith('a2');
  });
});
