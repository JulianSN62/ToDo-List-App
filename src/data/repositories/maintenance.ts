import { nowIso } from '@/lib/dates';
import { errorMeta, logger } from '@/lib/logger';
import { localFiles } from '@/platform';
import { getDb } from '../db';
import { settingsRepo } from './settingsRepo';
import { taskRepo } from './taskRepo';

// Limpieza local al abrir la app (idempotente). El servidor hace la misma limpieza
// una vez por día con una tarea programada (Fase 6).
export async function runStartupCleanup(): Promise<void> {
  try {
    // Sin la configuración real no se borra nada: usar el valor por defecto
    // podría eliminar tareas que el usuario quiere conservar más tiempo.
    const settings = await settingsRepo.getStored();
    if (settings) await taskRepo.purgeExpiredCompleted(settings.completedRetentionDays);
  } catch (error) {
    logger.warn('No se pudo completar la limpieza local', errorMeta(error));
  }
  try {
    await sweepLocalFiles();
  } catch (error) {
    logger.warn('No se pudieron limpiar los archivos locales', errorMeta(error));
  }
}

// Un archivo recién guardado puede no tener fila todavía (la transacción está en curso):
// solo se borran los huérfanos con más de una hora.
const ORPHAN_GRACE_MS = 60 * 60 * 1000;

// Borra del dispositivo los archivos de adjuntos que ya no existen o se eliminaron
// (el adjunto o su tarea), y marca como no guardados los que faltan.
export async function sweepLocalFiles(now: Date = new Date()): Promise<void> {
  const db = getDb();
  const rows = await db.getAll<{
    id: string;
    cached: number | null;
    attachment_id: string | null;
    deleted_at: string | null;
    task_deleted_at: string | null;
  }>(
    `SELECT s.id, s.cached, a.id AS attachment_id, a.deleted_at, t.deleted_at AS task_deleted_at
       FROM attachment_local_state s
       LEFT JOIN attachments a ON a.id = s.id
       LEFT JOIN tasks t ON t.id = a.task_id`,
  );
  const stored = await localFiles.list();
  const storedIds = new Set(stored.map((file) => file.id));
  const knownIds = new Set(rows.map((row) => row.id));

  const stale = rows
    .filter((row) => !row.attachment_id || row.deleted_at || row.task_deleted_at)
    .map((row) => row.id);
  const orphans = stored
    .filter((file) => !knownIds.has(file.id) && now.getTime() - file.savedAt > ORPHAN_GRACE_MS)
    .map((file) => file.id);
  const lost = rows
    .filter((row) => row.cached === 1 && !storedIds.has(row.id) && !stale.includes(row.id))
    .map((row) => row.id);

  if (stale.length > 0) {
    await db.execute(
      'DELETE FROM attachment_local_state WHERE id IN (SELECT value FROM json_each(?))',
      [JSON.stringify(stale)],
    );
  }
  if (lost.length > 0) {
    await db.execute(
      `UPDATE attachment_local_state SET cached = 0, updated_at = ?
        WHERE id IN (SELECT value FROM json_each(?))`,
      [nowIso(), JSON.stringify(lost)],
    );
  }
  const toRemove = [...stale.filter((id) => storedIds.has(id)), ...orphans];
  if (toRemove.length > 0) await localFiles.remove(toRemove);
}
