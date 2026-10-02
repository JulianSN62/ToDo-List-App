import type { ColorToken } from './colors';
import { normalizeLinkLabel, normalizeLinkUrl } from './links';
import { normalizeDescription, normalizeTitle } from './validation';

// Valores del formulario de crear/editar tarea y cálculo de qué cambió al guardar.

// Link en edición. "id" es null mientras no se guardó; "key" identifica la fila en la lista.
export interface LinkDraft {
  key: string;
  id: string | null;
  url: string;
  label: string;
}

// Archivo de la ventana. "id" es null mientras no se guardó; "data" solo existe en los
// nuevos (todavía no están en el dispositivo).
export interface FileDraft {
  key: string;
  id: string | null;
  name: string;
  mimeType: string;
  size: number;
  data: Blob | null;
}

export interface TaskFormValues {
  folderId: string;
  title: string;
  description: string;
  dueDate: string | null;
  isPriority: boolean;
  color: ColorToken | null;
  tagIds: string[];
  links: LinkDraft[];
  files: FileDraft[];
}

// Forma mínima de una tarea guardada (evita depender de la capa de datos).
export interface TaskFormSource {
  folderId: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  isPriority: boolean;
  color: ColorToken | null;
}

export interface SavedLink {
  id: string;
  url: string;
  label: string | null;
}

export interface SavedFile {
  id: string;
  name: string;
  mimeType: string;
  size: number;
}

export interface NewFileDraft {
  name: string;
  mimeType: string;
  size: number;
  data: Blob;
}

export interface TaskFormPatch {
  title?: string;
  description?: string | null;
  dueDate?: string | null;
  isPriority?: boolean;
  color?: ColorToken | null;
}

export interface NewLinkInput {
  url: string;
  label: string | null;
}

export interface TaskFormChanges {
  patch: TaskFormPatch;
  /** Carpeta nueva, o null si no cambió. */
  folderId: string | null;
  tags: { add: string[]; remove: string[] };
  links: { add: NewLinkInput[]; update: SavedLink[]; remove: string[] };
  files: { add: NewFileDraft[]; remove: string[] };
}

export type TaskFormError = 'titleRequired' | 'titleTooLong';

// Link que se está escribiendo en la ventana. "key" es null si es uno nuevo.
export interface LinkEditorDraft {
  key: string | null;
  url: string;
  label: string;
}

// Incorpora el link en edición a la lista. Un link nuevo vacío se ignora.
// Devuelve null si la dirección no es válida.
export function applyLinkDraft(
  links: readonly LinkDraft[],
  draft: LinkEditorDraft,
  createKey: () => string,
): LinkDraft[] | null {
  if (draft.key === null && !draft.url.trim() && !draft.label.trim()) return [...links];
  const url = normalizeLinkUrl(draft.url);
  if (!url) return null;
  const label = draft.label.trim();
  if (draft.key === null) return [...links, { key: createKey(), id: null, url, label }];
  return links.map((link) => (link.key === draft.key ? { ...link, url, label } : link));
}

// El link en edición tiene algo que se perdería al cerrar.
export function isLinkDraftDirty(
  links: readonly LinkDraft[],
  draft: LinkEditorDraft | null,
): boolean {
  if (!draft) return false;
  if (draft.key === null) return draft.url.trim() !== '' || draft.label.trim() !== '';
  const original = links.find((link) => link.key === draft.key);
  return (
    !original || original.url !== draft.url.trim() || original.label.trim() !== draft.label.trim()
  );
}

export function emptyTaskForm(folderId: string): TaskFormValues {
  return {
    folderId,
    title: '',
    description: '',
    dueDate: null,
    isPriority: false,
    color: null,
    tagIds: [],
    links: [],
    files: [],
  };
}

export function taskToForm(
  task: TaskFormSource,
  extras: {
    tagIds: readonly string[];
    links: readonly SavedLink[];
    files?: readonly SavedFile[];
  } = { tagIds: [], links: [] },
): TaskFormValues {
  return {
    folderId: task.folderId,
    title: task.title,
    description: task.description ?? '',
    dueDate: task.dueDate,
    isPriority: task.isPriority,
    color: task.color,
    tagIds: [...extras.tagIds],
    links: extras.links.map((link) => ({
      key: link.id,
      id: link.id,
      url: link.url,
      label: link.label ?? '',
    })),
    files: (extras.files ?? []).map((file) => ({
      key: file.id,
      id: file.id,
      name: file.name,
      mimeType: file.mimeType,
      size: file.size,
      data: null,
    })),
  };
}

// Solo el título es obligatorio.
export function validateTaskForm(values: TaskFormValues): TaskFormError | null {
  if (!values.title.trim()) return 'titleRequired';
  if (!normalizeTitle(values.title)) return 'titleTooLong';
  return null;
}

// Links listos para guardar al crear una tarea.
export function linksToCreate(links: readonly LinkDraft[]): NewLinkInput[] {
  return links.map((link) => ({ url: link.url, label: normalizeLinkLabel(link.label) }));
}

// Archivos nuevos listos para guardar.
export function filesToCreate(files: readonly FileDraft[]): NewFileDraft[] {
  return files.flatMap((file) =>
    file.id === null && file.data
      ? [{ name: file.name, mimeType: file.mimeType, size: file.size, data: file.data }]
      : [],
  );
}

function diffFiles(initial: readonly FileDraft[], current: readonly FileDraft[]) {
  const kept = new Set(current.flatMap((file) => (file.id === null ? [] : [file.id])));
  return {
    add: filesToCreate(current),
    remove: initial.flatMap((file) => (file.id !== null && !kept.has(file.id) ? [file.id] : [])),
  };
}

function diffLinks(initial: readonly LinkDraft[], current: readonly LinkDraft[]) {
  const before = new Map(
    initial.filter((link) => link.id !== null).map((link) => [link.id as string, link]),
  );
  const keptIds = new Set<string>();
  const add: NewLinkInput[] = [];
  const update: SavedLink[] = [];

  for (const link of current) {
    const label = normalizeLinkLabel(link.label);
    if (link.id === null) {
      add.push({ url: link.url, label });
      continue;
    }
    keptIds.add(link.id);
    const previous = before.get(link.id);
    if (previous && (previous.url !== link.url || normalizeLinkLabel(previous.label) !== label)) {
      update.push({ id: link.id, url: link.url, label });
    }
  }
  const remove = [...before.keys()].filter((id) => !keptIds.has(id));
  return { add, update, remove };
}

// Devuelve solo lo que cambió respecto de los valores iniciales, para no pisar
// cambios que lleguen por sincronización en otros campos.
export function diffTaskForm(initial: TaskFormValues, current: TaskFormValues): TaskFormChanges {
  const patch: TaskFormPatch = {};

  const title = normalizeTitle(current.title);
  if (title !== null && title !== normalizeTitle(initial.title)) patch.title = title;

  const description = normalizeDescription(current.description);
  if (description !== normalizeDescription(initial.description)) patch.description = description;

  if (current.dueDate !== initial.dueDate) patch.dueDate = current.dueDate;
  if (current.isPriority !== initial.isPriority) patch.isPriority = current.isPriority;
  if (current.color !== initial.color) patch.color = current.color;

  const beforeTags = new Set(initial.tagIds);
  const afterTags = new Set(current.tagIds);

  return {
    patch,
    folderId: current.folderId !== initial.folderId ? current.folderId : null,
    tags: {
      add: [...afterTags].filter((id) => !beforeTags.has(id)),
      remove: [...beforeTags].filter((id) => !afterTags.has(id)),
    },
    links: diffLinks(initial.links, current.links),
    files: diffFiles(initial.files, current.files),
  };
}

export function hasTaskFormChanges(changes: TaskFormChanges): boolean {
  return (
    Object.keys(changes.patch).length > 0 ||
    changes.folderId !== null ||
    changes.tags.add.length > 0 ||
    changes.tags.remove.length > 0 ||
    changes.links.add.length > 0 ||
    changes.links.update.length > 0 ||
    changes.links.remove.length > 0 ||
    changes.files.add.length > 0 ||
    changes.files.remove.length > 0
  );
}

function sameTagSet(a: readonly string[], b: readonly string[]): boolean {
  const setA = new Set(a);
  const setB = new Set(b);
  return setA.size === setB.size && [...setA].every((id) => setB.has(id));
}

function sameLinks(a: readonly LinkDraft[], b: readonly LinkDraft[]): boolean {
  return (
    a.length === b.length &&
    a.every((link, index) => {
      const other = b[index];
      return (
        other !== undefined &&
        link.id === other.id &&
        link.url === other.url &&
        normalizeLinkLabel(link.label) === normalizeLinkLabel(other.label)
      );
    })
  );
}

function sameFiles(a: readonly FileDraft[], b: readonly FileDraft[]): boolean {
  return a.length === b.length && a.every((file, index) => file.key === b[index]?.key);
}

// Hay cambios sin guardar (se pide confirmación antes de descartarlos).
export function isTaskFormDirty(initial: TaskFormValues, current: TaskFormValues): boolean {
  return (
    current.title.trim() !== initial.title.trim() ||
    normalizeDescription(current.description) !== normalizeDescription(initial.description) ||
    current.dueDate !== initial.dueDate ||
    current.isPriority !== initial.isPriority ||
    current.color !== initial.color ||
    current.folderId !== initial.folderId ||
    !sameTagSet(initial.tagIds, current.tagIds) ||
    !sameLinks(initial.links, current.links) ||
    !sameFiles(initial.files, current.files)
  );
}
