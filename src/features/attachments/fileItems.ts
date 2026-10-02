import type { FileStatus, TaskFile } from '@/data';
import type { FileDraft } from '@/lib/taskForm';

// Elementos de la lista de archivos (FileList): archivos guardados o nuevos de la ventana.

export interface FileListItem {
  key: string;
  /** null: todavía no se guardó (archivo nuevo en la ventana). */
  id: string | null;
  name: string;
  mimeType: string;
  size: number;
  status: FileStatus | 'draft';
  cached: boolean;
  /** Contenido de los archivos nuevos (todavía en memoria). */
  data: Blob | null;
}

export function toFileListItem(file: TaskFile): FileListItem {
  return {
    key: file.id,
    id: file.id,
    name: file.name,
    mimeType: file.mimeType,
    size: file.size,
    status: file.status,
    cached: file.cached,
    data: null,
  };
}

// Archivos de la ventana con el estado actual de los ya guardados.
export function draftsToFileItems(
  drafts: readonly FileDraft[],
  saved: readonly TaskFile[],
): FileListItem[] {
  const byId = new Map(saved.map((file) => [file.id, file]));
  return drafts.map((draft) => {
    const live = draft.id ? byId.get(draft.id) : undefined;
    return {
      key: draft.key,
      id: draft.id,
      name: draft.name,
      mimeType: draft.mimeType,
      size: draft.size,
      status: draft.id === null ? 'draft' : (live?.status ?? 'remote'),
      cached: live?.cached ?? false,
      data: draft.data,
    };
  });
}
