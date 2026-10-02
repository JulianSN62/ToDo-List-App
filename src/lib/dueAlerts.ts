import { addDaysToLocalDate, parseLocalDate } from './dates';

// Avisos automáticos de vencimiento (spec 6.6 y SET-3).
// La configuración vive en user_settings y tiene que pasar los CHECK de la base:
// user_settings_offsets_check (lista JSON de enteros) y user_settings_time_check (HH:mm).

/** Días de anticipación que se pueden elegir (0 = el mismo día). */
export const DUE_ALERT_OFFSET_OPTIONS: readonly number[] = [0, 1, 2, 3, 7];

export const DUE_ALERT_DEFAULTS = {
  enabled: true,
  offsets: [1, 0] as readonly number[],
  time: '09:00',
} as const;

export interface DueAlertSettings {
  enabled: boolean;
  offsets: readonly number[];
  /** Hora local HH:mm */
  time: string;
}

// Igual que user_settings_time_check.
const TIME_PATTERN = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;

export function isValidAlertTime(value: string): boolean {
  return TIME_PATTERN.test(value);
}

/** Solo valores permitidos, sin repetidos y de mayor a menor anticipación. */
export function normalizeOffsets(values: readonly number[]): number[] {
  return DUE_ALERT_OFFSET_OPTIONS.filter((option) => values.includes(option)).sort((a, b) => b - a);
}

/** Marca o desmarca un día. Nunca deja la lista vacía: el último marcado no se quita. */
export function toggleOffset(current: readonly number[], offset: number): number[] {
  const normalized = normalizeOffsets(current);
  if (!DUE_ALERT_OFFSET_OPTIONS.includes(offset)) return normalized;
  if (normalized.includes(offset)) {
    return normalized.length > 1 ? normalized.filter((value) => value !== offset) : normalized;
  }
  return normalizeOffsets([...normalized, offset]);
}

/** Texto que se guarda en due_alert_offsets, por ejemplo "[1,0]". */
export function serializeOffsets(offsets: readonly number[]): string {
  return JSON.stringify(normalizeOffsets(offsets));
}

/** Lee due_alert_offsets. Devuelve null si el texto no es una lista de enteros. */
export function parseOffsets(raw: string | null | undefined): number[] | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every((value) => Number.isInteger(value))) {
      return normalizeOffsets(parsed as number[]);
    }
  } catch {
    // Texto inválido: el que llama decide qué usar.
  }
  return null;
}

/**
 * Instantes en que corresponde avisar que vence una tarea (spec 6.6): para cada día de
 * anticipación, (fecha límite − días) a la hora configurada, en hora local. Solo los que
 * todavía no pasaron, del más cercano al más lejano. Sin alertas activas, ninguno.
 */
export function dueAlertFireTimes(
  dueDate: string,
  settings: DueAlertSettings,
  now: Date = new Date(),
): Date[] {
  if (!settings.enabled || !isValidAlertTime(settings.time) || !parseLocalDate(dueDate)) {
    return [];
  }
  const [hours = 0, minutes = 0] = settings.time.split(':').map(Number);
  return normalizeOffsets(settings.offsets)
    .map((offset) => {
      const day = parseLocalDate(addDaysToLocalDate(dueDate, -offset));
      return day ? new Date(day.year, day.month - 1, day.day, hours, minutes) : null;
    })
    .filter((date): date is Date => date !== null && date.getTime() > now.getTime())
    .sort((a, b) => a.getTime() - b.getTime());
}
