import { logger, errorMeta } from '@/lib/logger';
import { localFiles } from '@/platform';
import { SupabaseConnector } from './connector';
import { getDb } from './db';
import { stopFileSync } from './fileSync';

// Conexión del motor de sincronización. La app funciona igual sin conexión:
// esto solo sube y baja cambios cuando hay internet.

const connector = new SupabaseConnector();

export async function startSync(): Promise<void> {
  try {
    await getDb().connect(connector);
  } catch (error) {
    logger.warn('No se pudo iniciar la sincronización', errorMeta(error));
  }
}

// Fuerza un nuevo intento inmediato (botón "Sincronizar ahora").
export async function syncNow(): Promise<void> {
  const db = getDb();
  try {
    await db.disconnect();
    await db.connect(connector);
  } catch (error) {
    logger.warn('No se pudo forzar la sincronización', errorMeta(error));
  }
}

// Al cerrar sesión: corta la sincronización y borra todos los datos locales,
// incluidos los archivos adjuntos guardados en el dispositivo.
export async function stopSyncAndClear(): Promise<void> {
  await stopFileSync();
  await getDb().disconnectAndClear();
  await localFiles.clear().catch((error: unknown) => {
    logger.warn('No se pudieron borrar los archivos locales', errorMeta(error));
  });
}

// Cambios y archivos que todavía no se subieron (se perderían al cerrar sesión).
export async function getPendingUploadCount(): Promise<number> {
  const db = getDb();
  let total = 0;
  try {
    total += (await db.getUploadQueueStats()).count;
  } catch {
    // Sin estadísticas: se cuenta lo demás.
  }
  try {
    const files = await db.get<{ total: number }>(
      `SELECT COUNT(*) AS total
         FROM attachment_local_state s
         JOIN attachments a ON a.id = s.id
         JOIN tasks t ON t.id = a.task_id
        WHERE s.upload_status IN ('pending', 'uploading', 'failed')
          AND a.deleted_at IS NULL AND t.deleted_at IS NULL`,
    );
    total += files.total;
  } catch {
    // Igual que arriba.
  }
  return total;
}
