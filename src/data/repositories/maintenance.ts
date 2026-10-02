import { errorMeta, logger } from '@/lib/logger';
import { settingsRepo } from './settingsRepo';
import { taskRepo } from './taskRepo';

// Limpieza local al abrir la app (idempotente). El servidor hace la misma limpieza
// una vez por día con una tarea programada (Fase 6).
export async function runStartupCleanup(): Promise<void> {
  try {
    // Sin la configuración real no se borra nada: usar el valor por defecto
    // podría eliminar tareas que el usuario quiere conservar más tiempo.
    const settings = await settingsRepo.getStored();
    if (!settings) return;
    await taskRepo.purgeExpiredCompleted(settings.completedRetentionDays);
  } catch (error) {
    logger.warn('No se pudo completar la limpieza local', errorMeta(error));
  }
}
