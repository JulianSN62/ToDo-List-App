import { logger, errorMeta } from '@/lib/logger';
import { files, localFiles } from '@/platform';
import { SupabaseConnector } from './connector';
import { getDb } from './db';
import { stopFileSync } from './fileSync';
import { clearNotifications, stopNotificationSync } from './notificationSync';

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
// incluidos los archivos adjuntos guardados en el dispositivo y las notificaciones.
export async function stopSyncAndClear(): Promise<void> {
  await stopFileSync();
  await stopNotificationSync();
  await clearNotifications().catch((error: unknown) => {
    logger.warn('No se pudieron quitar las notificaciones', errorMeta(error));
  });
  await getDb().disconnectAndClear();
  await localFiles.clear().catch((error: unknown) => {
    logger.warn('No se pudieron borrar los archivos locales', errorMeta(error));
  });
  // Copias que se compartieron (respaldo JSON y adjuntos) en la caché de Android.
  await files.clearShared().catch((error: unknown) => {
    logger.warn('No se pudieron borrar las copias compartidas', errorMeta(error));
  });
}

// Cambios y archivos que todavía no se subieron (se perderían al cerrar sesión).
export async function getPendingUploadCount(): Promise<number> {
  const db = getDb();
  let total = 0;
  try {
    total += (await db.getUploadQueueStats()).count;
  } catch (error) {
    // Sin estadísticas: se cuenta lo demás (el aviso puede quedar corto).
    logger.warn('No se pudieron contar los cambios sin subir', errorMeta(error));
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
  } catch (error) {
    logger.warn('No se pudieron contar los archivos sin subir', errorMeta(error));
  }
  return total;
}
