import { parseInstant } from './dates';

// Retención de tareas completadas: se borran definitivamente a los N días de completadas.

const DAY_MS = 24 * 60 * 60 * 1000;

export const RETENTION_LIMITS = { min: 1, max: 90, default: 7 } as const;
// Elementos eliminados lógicamente (para "Deshacer") se purgan a los 30 días.
export const SOFT_DELETE_PURGE_DAYS = 30;

export function clampRetentionDays(days: number): number {
  if (!Number.isFinite(days)) return RETENTION_LIMITS.default;
  return Math.min(RETENTION_LIMITS.max, Math.max(RETENTION_LIMITS.min, Math.round(days)));
}

// Días que faltan para que se borre una tarea completada (0 = se borra hoy).
export function daysUntilPurge(
  doneAt: string | null,
  retentionDays: number,
  now: Date = new Date(),
): number {
  const done = parseInstant(doneAt);
  if (!done) return clampRetentionDays(retentionDays);
  const purgeAt = done.getTime() + clampRetentionDays(retentionDays) * DAY_MS;
  return Math.max(0, Math.ceil((purgeAt - now.getTime()) / DAY_MS));
}

// true si la tarea completada ya superó el período de retención.
export function isRetentionExpired(
  doneAt: string | null,
  retentionDays: number,
  now: Date = new Date(),
): boolean {
  const done = parseInstant(doneAt);
  if (!done) return false;
  return done.getTime() + clampRetentionDays(retentionDays) * DAY_MS <= now.getTime();
}

// true si un elemento eliminado lógicamente ya puede purgarse.
export function isSoftDeleteExpired(deletedAt: string | null, now: Date = new Date()): boolean {
  const deleted = parseInstant(deletedAt);
  if (!deleted) return false;
  return deleted.getTime() + SOFT_DELETE_PURGE_DAYS * DAY_MS <= now.getTime();
}
