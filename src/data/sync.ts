import { logger, errorMeta } from '@/lib/logger';
import { SupabaseConnector } from './connector';
import { getDb } from './db';

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

// Al cerrar sesión: corta la sincronización y borra todos los datos locales.
export async function stopSyncAndClear(): Promise<void> {
  await getDb().disconnectAndClear();
}

export async function getPendingUploadCount(): Promise<number> {
  try {
    const stats = await getDb().getUploadQueueStats();
    return stats.count;
  } catch {
    return 0;
  }
}
