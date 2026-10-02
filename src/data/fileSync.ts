import { nowIso } from '@/lib/dates';
import { errorMeta, logger } from '@/lib/logger';
import {
  afterUploadAttempt,
  classifyUploadError,
  msUntilNextAttempt,
  type UploadResult,
  type UploadState,
  type UploadStatus,
} from '@/lib/uploadQueue';
import { lifecycle, localFiles } from '@/platform';
import { getDb } from './db';
import { RemoteFileError, uploadRemoteFile } from './fileStorage';

// Cola de subida de archivos adjuntos (spec 10.2): sube de a uno los archivos
// pendientes, con reintentos, cuando hay conexión. Corre mientras hay una sesión.
// Entre pestañas se coordina con un candado del navegador para no subir dos veces.

const LOCK_NAME = 'todo-file-uploads';
const WATCHED_TABLES = ['attachment_local_state', 'attachments', 'tasks'];

interface QueueRow {
  id: string;
  upload_status: string;
  attempts: number | null;
  next_attempt_at: string | null;
  last_error: string | null;
  storage_path: string;
  mime_type: string | null;
}

let running = false;
let active: Promise<void> | null = null;
let runAgain = false;
let timer: number | null = null;
let stopListeners: (() => void)[] = [];
// Cancela la espera del candado al cerrar sesión (si otra pestaña lo tiene tomado).
let lockAbort: AbortController | null = null;

function toState(row: QueueRow): UploadState {
  return {
    status: row.upload_status as UploadStatus,
    attempts: row.attempts ?? 0,
    nextAttemptAt: row.next_attempt_at,
    lastError: row.last_error,
  };
}

async function withUploadLock(work: () => Promise<void>): Promise<void> {
  if (typeof navigator !== 'undefined' && navigator.locks) {
    lockAbort ??= new AbortController();
    await navigator.locks.request(LOCK_NAME, { signal: lockAbort.signal }, work);
  } else {
    await work();
  }
}

// El siguiente archivo que toca subir: pendiente, con su espera cumplida y de un
// adjunto (y una tarea) que no se borró.
async function nextDue(now: string): Promise<QueueRow | null> {
  return getDb().getOptional<QueueRow>(
    `SELECT s.id, s.upload_status, s.attempts, s.next_attempt_at, s.last_error,
            a.storage_path, a.mime_type
       FROM attachment_local_state s
       JOIN attachments a ON a.id = s.id
       JOIN tasks t ON t.id = a.task_id
      WHERE s.upload_status = 'pending'
        AND (s.next_attempt_at IS NULL OR s.next_attempt_at <= ?)
        AND a.storage_path IS NOT NULL
        AND a.deleted_at IS NULL
        AND t.deleted_at IS NULL
      ORDER BY a.created_at, a.id
      LIMIT 1`,
    [now],
  );
}

async function saveState(id: string, state: UploadState, expected: UploadStatus): Promise<void> {
  await getDb().execute(
    `UPDATE attachment_local_state
        SET upload_status = ?, attempts = ?, next_attempt_at = ?, last_error = ?, updated_at = ?
      WHERE id = ? AND upload_status = ?`,
    [state.status, state.attempts, state.nextAttemptAt, state.lastError, nowIso(), id, expected],
  );
}

async function uploadOne(row: QueueRow): Promise<void> {
  const state = toState(row);
  await saveState(row.id, { ...state, status: 'uploading' }, 'pending');
  let result: UploadResult;
  const blob = await localFiles.get(row.id).catch(() => null);
  if (!blob) {
    // Se perdió la copia local (por ejemplo, se borraron los datos del sitio).
    result = { ok: false, failure: { kind: 'permanent', code: 'missing' } };
  } else {
    try {
      await uploadRemoteFile(row.storage_path, blob, row.mime_type ?? blob.type);
      result = { ok: true };
    } catch (error) {
      const status = error instanceof RemoteFileError ? error.status : null;
      const code = error instanceof RemoteFileError ? error.code : 'unknown';
      result = { ok: false, failure: { kind: classifyUploadError(status), code } };
      // Solo el código: nunca el nombre del archivo ni su contenido.
      logger.warn('No se pudo subir un archivo', { code });
    }
  }
  const next = afterUploadAttempt(state, result, { now: new Date(), online: navigator.onLine });
  await saveState(row.id, next, 'uploading');
}

async function drain(): Promise<void> {
  if (!navigator.onLine) return;
  await withUploadLock(async () => {
    // Con el candado nadie más está subiendo: lo que quedó "subiendo" se cortó.
    await getDb().execute(
      `UPDATE attachment_local_state SET upload_status = 'pending', updated_at = ?
        WHERE upload_status = 'uploading'`,
      [nowIso()],
    );
    while (running && navigator.onLine) {
      const row = await nextDue(nowIso());
      if (!row) break;
      await uploadOne(row);
    }
  });
}

// Programa el próximo reintento según la espera más corta pendiente.
async function scheduleNext(): Promise<void> {
  if (timer !== null) window.clearTimeout(timer);
  timer = null;
  if (!running) return;
  const rows = await getDb().getAll<{
    upload_status: UploadStatus;
    next_attempt_at: string | null;
  }>(
    `SELECT upload_status, next_attempt_at FROM attachment_local_state
      WHERE upload_status = 'pending' AND next_attempt_at IS NOT NULL`,
  );
  const wait = msUntilNextAttempt(
    rows.map((row) => ({ status: row.upload_status, nextAttemptAt: row.next_attempt_at })),
    new Date(),
  );
  if (wait !== null && running) timer = window.setTimeout(trigger, wait + 50);
}

function trigger(): void {
  if (!running) return;
  if (active) {
    runAgain = true;
    return;
  }
  active = drain()
    .catch((error: unknown) => logger.warn('Falló la cola de subida', errorMeta(error)))
    .then(() => scheduleNext())
    .catch(() => undefined)
    .finally(() => {
      active = null;
      if (runAgain) {
        runAgain = false;
        trigger();
      }
    });
}

export function startFileSync(): void {
  if (running) return;
  running = true;
  const unsubscribe = getDb().onChange(
    { onChange: () => trigger() },
    { tables: WATCHED_TABLES, throttleMs: 300 },
  );
  window.addEventListener('online', trigger);
  stopListeners = [
    unsubscribe,
    () => window.removeEventListener('online', trigger),
    lifecycle.onResume(trigger),
  ];
  trigger();
}

/** Corta la cola (al cerrar sesión). Espera a que termine la subida en curso. */
export async function stopFileSync(): Promise<void> {
  running = false;
  runAgain = false;
  lockAbort?.abort();
  lockAbort = null;
  if (timer !== null) window.clearTimeout(timer);
  timer = null;
  for (const stop of stopListeners) stop();
  stopListeners = [];
  await active?.catch(() => undefined);
}

/** Vuelve a intentar enseguida (por ejemplo, después de "Reintentar"). */
export function wakeFileSync(): void {
  trigger();
}
