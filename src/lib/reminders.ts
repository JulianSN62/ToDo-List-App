import { isValidAlertTime } from './dueAlerts';
import { parseInstant, parseLocalDate } from './dates';
import { LIMITS } from './validation';

// Recordatorios personalizados (spec 9.7 y D10): mensaje opcional y una o varias fechas y
// horas. Cada fecha es una fila de reminder_times; al dispararse se borra y, cuando no le
// quedan fechas, se borra el recordatorio.

/** Fechas que puede tener un recordatorio. */
export const MAX_REMINDER_TIMES = 10;

/** Fecha guardada (o por guardar). "id" es null mientras no se guardó. */
export interface ReminderTimeValue {
  id: string | null;
  /** Instante en ISO 8601 UTC. */
  fireAt: string;
}

/** Recordatorio en la ventana de la tarea. "id" es null mientras no se guardó. */
export interface ReminderDraft {
  key: string;
  id: string | null;
  message: string;
  times: ReminderTimeValue[];
}

/** Fila de fecha y hora en la ventana del recordatorio (hora local). */
export interface ReminderTimeRow {
  key: string;
  /** YYYY-MM-DD, o vacío si todavía no se eligió. */
  date: string;
  /** HH:mm, o vacío si todavía no se eligió. */
  time: string;
}

export type ReminderRowError = 'incomplete' | 'past';

export type ReminderDraftResult =
  | { ok: true; message: string | null; times: ReminderTimeValue[] }
  | {
      ok: false;
      /** Error general: sin fechas, demasiadas o mensaje largo. */
      error: 'noTimes' | 'tooMany' | 'messageTooLong' | null;
      /** Error de cada fila, por su clave. */
      rows: Record<string, ReminderRowError>;
    };

/** Mensaje recortado; vacío se guarda como null. */
export function normalizeReminderMessage(raw: string): string | null {
  const value = raw.trim();
  return value ? value : null;
}

/** Instante de una fila (fecha y hora locales), o null si está incompleta o no es válida. */
export function rowToInstant(row: Pick<ReminderTimeRow, 'date' | 'time'>): Date | null {
  const day = parseLocalDate(row.date);
  if (!day || !isValidAlertTime(row.time)) return null;
  const [hours = 0, minutes = 0] = row.time.split(':').map(Number);
  return new Date(day.year, day.month - 1, day.day, hours, minutes);
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** Fila para mostrar un instante guardado en la hora local del dispositivo. */
export function instantToRow(key: string, fireAt: string): ReminderTimeRow {
  const date = parseInstant(fireAt);
  if (!date) return { key, date: '', time: '' };
  return {
    key,
    date: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    time: `${pad(date.getHours())}:${pad(date.getMinutes())}`,
  };
}

/** Fila nueva: la próxima hora en punto (14:37 → 15:00 de hoy; 23:20 → 00:00 de mañana). */
export function defaultReminderRow(key: string, now: Date = new Date()): ReminderTimeRow {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() + 1);
  return instantToRow(key, next.toISOString());
}

/** Instante en ISO normalizado (la sincronización puede devolverlo con otro formato). */
export function normalizeInstant(value: string): string | null {
  return parseInstant(value)?.toISOString() ?? null;
}

/**
 * Valida la ventana del recordatorio. Las fechas que ya estaban guardadas y no cambiaron
 * conservan su id; las nuevas o cambiadas no pueden estar en el pasado. Sin repetidas y
 * ordenadas de la más cercana a la más lejana.
 */
export function validateReminderDraft(
  message: string,
  rows: readonly ReminderTimeRow[],
  saved: readonly ReminderTimeValue[],
  now: Date = new Date(),
): ReminderDraftResult {
  const rowErrors: Record<string, ReminderRowError> = {};
  const savedByInstant = new Map(
    saved.flatMap((time) => {
      const iso = normalizeInstant(time.fireAt);
      return iso ? [[iso, time.id] as const] : [];
    }),
  );
  const times = new Map<string, ReminderTimeValue>();

  for (const row of rows) {
    // Una fila nueva sin tocar no cuenta.
    if (!row.date && !row.time) continue;
    const instant = rowToInstant(row);
    if (!instant) {
      rowErrors[row.key] = 'incomplete';
      continue;
    }
    const iso = instant.toISOString();
    const savedId = savedByInstant.get(iso);
    if (savedId === undefined && instant.getTime() <= now.getTime()) {
      rowErrors[row.key] = 'past';
      continue;
    }
    times.set(iso, { id: savedId ?? null, fireAt: iso });
  }

  const normalizedMessage = normalizeReminderMessage(message);
  let error: 'noTimes' | 'tooMany' | 'messageTooLong' | null = null;
  if (normalizedMessage && normalizedMessage.length > LIMITS.reminderMessage) {
    error = 'messageTooLong';
  } else if (Object.keys(rowErrors).length === 0 && times.size === 0) {
    error = 'noTimes';
  } else if (times.size > MAX_REMINDER_TIMES) {
    error = 'tooMany';
  }
  if (error || Object.keys(rowErrors).length > 0) {
    return { ok: false, error, rows: rowErrors };
  }
  return {
    ok: true,
    message: normalizedMessage,
    times: [...times.values()].sort((a, b) => a.fireAt.localeCompare(b.fireAt)),
  };
}

/** Solo las fechas que todavía no pasaron, de la más cercana a la más lejana. */
export function upcomingTimes<T extends { fireAt: string }>(
  times: readonly T[],
  now: Date = new Date(),
): T[] {
  return times
    .filter((time) => (parseInstant(time.fireAt)?.getTime() ?? 0) > now.getTime())
    .sort(
      (a, b) => (parseInstant(a.fireAt)?.getTime() ?? 0) - (parseInstant(b.fireAt)?.getTime() ?? 0),
    );
}

export interface NewReminderInput {
  message: string | null;
  fireAts: string[];
}

export interface ReminderUpdate {
  id: string;
  /** Mensaje nuevo, o undefined si no cambió. */
  message?: string | null;
  addFireAts: string[];
  removeTimeIds: string[];
}

export interface ReminderChanges {
  add: NewReminderInput[];
  update: ReminderUpdate[];
  remove: string[];
}

/** Recordatorios nuevos listos para guardar al crear una tarea. */
export function remindersToCreate(drafts: readonly ReminderDraft[]): NewReminderInput[] {
  return drafts.flatMap((draft) =>
    draft.id === null && draft.times.length > 0
      ? [
          {
            message: normalizeReminderMessage(draft.message),
            fireAts: draft.times.map((time) => time.fireAt),
          },
        ]
      : [],
  );
}

/** Qué cambió en los recordatorios de la ventana respecto de los guardados. */
export function diffReminders(
  initial: readonly ReminderDraft[],
  current: readonly ReminderDraft[],
): ReminderChanges {
  const before = new Map(
    initial.flatMap((draft) => (draft.id === null ? [] : [[draft.id, draft] as const])),
  );
  const kept = new Set<string>();
  const update: ReminderUpdate[] = [];

  for (const draft of current) {
    if (draft.id === null) continue;
    kept.add(draft.id);
    const previous = before.get(draft.id);
    if (!previous) continue;
    const message = normalizeReminderMessage(draft.message);
    const currentIds = new Set(draft.times.flatMap((time) => (time.id ? [time.id] : [])));
    const change: ReminderUpdate = {
      id: draft.id,
      addFireAts: draft.times.filter((time) => time.id === null).map((time) => time.fireAt),
      removeTimeIds: previous.times.flatMap((time) =>
        time.id && !currentIds.has(time.id) ? [time.id] : [],
      ),
    };
    if (message !== normalizeReminderMessage(previous.message)) change.message = message;
    if (
      change.message !== undefined ||
      change.addFireAts.length > 0 ||
      change.removeTimeIds.length > 0
    ) {
      update.push(change);
    }
  }

  return {
    add: remindersToCreate(current),
    update,
    remove: [...before.keys()].filter((id) => !kept.has(id)),
  };
}

export function hasReminderChanges(changes: ReminderChanges): boolean {
  return changes.add.length > 0 || changes.update.length > 0 || changes.remove.length > 0;
}

function sameTimes(a: readonly ReminderTimeValue[], b: readonly ReminderTimeValue[]): boolean {
  return (
    a.length === b.length &&
    a.every((time, index) => time.id === b[index]?.id && time.fireAt === b[index]?.fireAt)
  );
}

/** Los recordatorios de la ventana cambiaron (para pedir confirmación antes de descartar). */
export function sameReminders(a: readonly ReminderDraft[], b: readonly ReminderDraft[]): boolean {
  return (
    a.length === b.length &&
    a.every((draft, index) => {
      const other = b[index];
      return (
        other !== undefined &&
        draft.key === other.key &&
        normalizeReminderMessage(draft.message) === normalizeReminderMessage(other.message) &&
        sameTimes(draft.times, other.times)
      );
    })
  );
}
