import type { Transaction } from '@powersync/web';
import { nowIso } from '@/lib/dates';
import {
  buildStoragePath,
  displayFileName,
  isWithinSizeLimit,
  normalizeMimeType,
} from '@/lib/files';
import { newId } from '@/lib/ids';
import { errorMeta, logger } from '@/lib/logger';
import { keyBetween } from '@/lib/ordering';
import { retryNow } from '@/lib/uploadQueue';
import { localFiles } from '@/platform';
import { getDb } from '../db';
import { downloadRemoteFile, RemoteFileError } from '../fileStorage';

// Archivos adjuntos (spec 10.2). El archivo se guarda primero en el dispositivo y la
// fila queda "pendiente": la cola (fileSync.ts) lo sube a Storage cuando hay conexión.
// Al abrir uno que no está en el dispositivo, se descarga y queda guardado.

/** Archivo nuevo, ya comprimido y validado, listo para adjuntar. */
export interface NewFileInput {
  name: string;
  mimeType: string;
  size: number;
  data: Blob;
}

interface StagedFile extends NewFileInput {
  id: string;
  storagePath: string;
}

export type FileFetchErrorKind = 'offline' | 'notUploadedYet' | 'failed';

/** No se pudo obtener el archivo. "kind" dice qué mostrar. */
export class FileFetchError extends Error {
  readonly kind: FileFetchErrorKind;

  constructor(kind: FileFetchErrorKind) {
    super(`No se pudo obtener el archivo (${kind})`);
    this.name = 'FileFetchError';
    this.kind = kind;
  }
}

type Queryable = {
  getOptional: <T>(sql: string, params?: unknown[]) => Promise<T | null>;
};

export async function lastAttachmentPosition(
  query: Queryable,
  taskId: string,
): Promise<string | null> {
  const last = await query.getOptional<{ position: string }>(
    `SELECT position FROM attachments
      WHERE deleted_at IS NULL AND task_id = ?
      ORDER BY position DESC, id DESC LIMIT 1`,
    [taskId],
  );
  return last?.position ?? null;
}

// Antes de la transacción: guarda cada archivo en el dispositivo. Si algo falla, no
// queda nada guardado y no se crea ninguna fila.
export async function stageFiles(
  ownerId: string,
  taskId: string,
  files: readonly NewFileInput[],
): Promise<StagedFile[]> {
  const staged: StagedFile[] = [];
  try {
    for (const file of files) {
      if (!isWithinSizeLimit(file.size)) throw new Error('Archivo demasiado grande');
      const id = newId();
      const name = displayFileName(file.name);
      await localFiles.put(id, file.data);
      staged.push({
        ...file,
        id,
        name,
        mimeType: normalizeMimeType(file.mimeType),
        storagePath: buildStoragePath(ownerId, taskId, id, name),
      });
    }
  } catch (error) {
    await discardStagedFiles(staged);
    throw error;
  }
  if (staged.length > 0) void localFiles.requestPersistence();
  return staged;
}

export async function discardStagedFiles(staged: readonly { id: string }[]): Promise<void> {
  if (staged.length === 0) return;
  await localFiles.remove(staged.map((file) => file.id)).catch(() => undefined);
}

// Dentro de la transacción: filas de los archivos (al final de los adjuntos) y su
// estado local "pendiente de subir".
export async function insertFileRows(
  tx: Transaction,
  taskId: string,
  ownerId: string,
  staged: readonly StagedFile[],
  now: string,
): Promise<void> {
  if (staged.length === 0) return;
  let position = await lastAttachmentPosition(tx, taskId);
  const initial = retryNow();
  for (const file of staged) {
    position = keyBetween(position, null);
    await tx.execute(
      `INSERT INTO attachments (id, owner_id, task_id, kind, storage_path, file_name, mime_type,
                                size_bytes, position, created_at, updated_at)
       VALUES (?, ?, ?, 'file', ?, ?, ?, ?, ?, ?, ?)`,
      [
        file.id,
        ownerId,
        taskId,
        file.storagePath,
        file.name,
        file.mimeType,
        file.size,
        position,
        now,
        now,
      ],
    );
    await tx.execute(
      `INSERT INTO attachment_local_state (id, upload_status, attempts, next_attempt_at, last_error,
                                           cached, updated_at)
       VALUES (?, ?, ?, ?, ?, 1, ?)`,
      [file.id, initial.status, initial.attempts, initial.nextAttemptAt, initial.lastError, now],
    );
  }
}

// Marca un archivo como guardado en el dispositivo (las vistas no admiten UPSERT).
async function markCached(id: string): Promise<void> {
  const now = nowIso();
  await getDb().writeTransaction(async (tx) => {
    const existing = await tx.getOptional<{ id: string }>(
      'SELECT id FROM attachment_local_state WHERE id = ?',
      [id],
    );
    if (existing) {
      await tx.execute(
        'UPDATE attachment_local_state SET cached = 1, updated_at = ? WHERE id = ?',
        [now, id],
      );
    } else {
      await tx.execute(
        `INSERT INTO attachment_local_state (id, upload_status, attempts, cached, updated_at)
         VALUES (?, NULL, 0, 1, ?)`,
        [id, now],
      );
    }
  });
}

// Descarga un archivo que no está en el dispositivo y lo guarda.
const downloads = new Map<string, Promise<Blob>>();

async function download(id: string): Promise<Blob> {
  const row = await getDb().getOptional<{ storage_path: string | null }>(
    "SELECT storage_path FROM attachments WHERE id = ? AND kind = 'file'",
    [id],
  );
  if (!row?.storage_path) throw new FileFetchError('failed');
  let blob: Blob;
  try {
    blob = await downloadRemoteFile(row.storage_path);
  } catch (error) {
    if (error instanceof RemoteFileError) {
      if (error.notFound) throw new FileFetchError('notUploadedYet');
      if (error.status === null) throw new FileFetchError('offline');
    }
    logger.warn('No se pudo descargar un archivo', errorMeta(error));
    throw new FileFetchError('failed');
  }
  try {
    await localFiles.put(id, blob);
    await markCached(id);
  } catch (error) {
    // Se puede mostrar igual; solo no queda guardado para verlo sin conexión.
    logger.warn('No se pudo guardar un archivo descargado', errorMeta(error));
  }
  return blob;
}

async function readLocal(id: string): Promise<Blob | null> {
  try {
    return await localFiles.get(id);
  } catch {
    return null;
  }
}

export const fileRepo = {
  /** El archivo guardado en el dispositivo, o null si no está. */
  readLocal,

  /** El archivo para verlo: del dispositivo o, si no está, descargado de Storage. */
  async getFile(id: string): Promise<Blob> {
    const local = await readLocal(id);
    if (local) return local;
    let pending = downloads.get(id);
    if (!pending) {
      pending = download(id).finally(() => downloads.delete(id));
      downloads.set(id, pending);
    }
    return pending;
  },

  /** "Reintentar": el archivo vuelve a la cola de subida. */
  async retryUpload(id: string): Promise<void> {
    const state = retryNow();
    await getDb().execute(
      `UPDATE attachment_local_state
          SET upload_status = ?, attempts = ?, next_attempt_at = ?, last_error = ?, updated_at = ?
        WHERE id = ? AND upload_status IN ('pending', 'failed')`,
      [state.status, state.attempts, state.nextAttemptAt, state.lastError, nowIso(), id],
    );
  },

  /** Borra del dispositivo los archivos que ya están en la nube. Devuelve cuántos. */
  async freeDeviceSpace(): Promise<number> {
    const db = getDb();
    const rows = await db.getAll<{ id: string }>(
      `SELECT id FROM attachment_local_state
        WHERE cached = 1 AND (upload_status IS NULL OR upload_status = 'uploaded')`,
    );
    if (rows.length === 0) return 0;
    const ids = rows.map((row) => row.id);
    await db.execute(
      `UPDATE attachment_local_state SET cached = 0, updated_at = ?
        WHERE id IN (SELECT value FROM json_each(?))`,
      [nowIso(), JSON.stringify(ids)],
    );
    await localFiles.remove(ids);
    return ids.length;
  },
};
