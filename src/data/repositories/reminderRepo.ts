import type { Transaction } from '@powersync/web';
import { nowIso, parseInstant } from '@/lib/dates';
import { newId } from '@/lib/ids';
import {
  MAX_REMINDER_TIMES,
  normalizeInstant,
  type NewReminderInput,
  type ReminderChanges,
} from '@/lib/reminders';
import { LIMITS } from '@/lib/validation';
import { requireUserId } from '../currentUser';
import { getDb } from '../db';

// Recordatorios personalizados (spec 9.7). Un recordatorio tiene un mensaje opcional y una o
// varias fechas (reminder_times). Las tablas no tienen borrado lógico: al quitar algo se
// borra la fila (en el servidor, las fechas se borran en cascada con su recordatorio).

function validMessage(message: string | null): string | null {
  const value = message?.trim() ?? '';
  if (!value) return null;
  if (value.length > LIMITS.reminderMessage) throw new Error('Mensaje de recordatorio inválido');
  return value;
}

function validFireAts(fireAts: readonly string[]): string[] {
  const values = [...new Set(fireAts.map((value) => normalizeInstant(value)))];
  if (values.some((value) => value === null)) throw new Error('Fecha de recordatorio inválida');
  return values as string[];
}

async function insertTimes(
  tx: Transaction,
  reminderId: string,
  taskId: string,
  ownerId: string,
  fireAts: readonly string[],
  now: string,
): Promise<void> {
  for (const fireAt of fireAts) {
    await tx.execute(
      `INSERT INTO reminder_times (id, owner_id, reminder_id, task_id, fire_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [newId(), ownerId, reminderId, taskId, fireAt, now, now],
    );
  }
}

/** Crea recordatorios con sus fechas (el recordatorio primero: las fechas lo referencian). */
export async function insertReminders(
  tx: Transaction,
  taskId: string,
  ownerId: string,
  inputs: readonly NewReminderInput[],
  now: string,
): Promise<void> {
  for (const input of inputs) {
    const fireAts = validFireAts(input.fireAts);
    if (fireAts.length === 0) continue;
    if (fireAts.length > MAX_REMINDER_TIMES) throw new Error('Demasiadas fechas');
    const id = newId();
    await tx.execute(
      `INSERT INTO reminders (id, owner_id, task_id, message, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, ownerId, taskId, validMessage(input.message), now, now],
    );
    await insertTimes(tx, id, taskId, ownerId, fireAts, now);
  }
}

/** Aplica los cambios de recordatorios de la ventana de la tarea. */
export async function applyReminderChanges(
  tx: Transaction,
  taskId: string,
  ownerId: string,
  changes: ReminderChanges,
  now: string,
): Promise<void> {
  for (const reminderId of changes.remove) {
    await tx.execute('DELETE FROM reminder_times WHERE reminder_id = ? AND task_id = ?', [
      reminderId,
      taskId,
    ]);
    await tx.execute('DELETE FROM reminders WHERE id = ? AND task_id = ?', [reminderId, taskId]);
  }
  for (const update of changes.update) {
    const exists = await tx.getOptional<{ id: string }>(
      'SELECT id FROM reminders WHERE id = ? AND task_id = ?',
      [update.id, taskId],
    );
    // Se borró en otro dispositivo mientras la ventana estaba abierta.
    if (!exists) continue;
    if (update.message !== undefined) {
      await tx.execute('UPDATE reminders SET message = ?, updated_at = ? WHERE id = ?', [
        validMessage(update.message),
        now,
        update.id,
      ]);
    }
    for (const timeId of update.removeTimeIds) {
      await tx.execute('DELETE FROM reminder_times WHERE id = ? AND reminder_id = ?', [
        timeId,
        update.id,
      ]);
    }
    await insertTimes(tx, update.id, taskId, ownerId, validFireAts(update.addFireAts), now);
  }
  await insertReminders(tx, taskId, ownerId, changes.add, now);
}

export const reminderRepo = {
  /** Agrega un recordatorio a una tarea (desde el menú de la fila: se guarda enseguida). */
  async add(taskId: string, input: NewReminderInput): Promise<void> {
    const ownerId = requireUserId();
    const now = nowIso();
    await getDb().writeTransaction(async (tx) => {
      await insertReminders(tx, taskId, ownerId, [input], now);
    });
  },

  /**
   * Borra las fechas que ya pasaron y los recordatorios que quedaron sin fechas (spec 9.4.4).
   * Las fechas pueden venir del servidor con otro formato, así que se comparan como instantes.
   * Es idempotente: puede correr en cualquier dispositivo.
   */
  async deleteFired(now: Date = new Date()): Promise<number> {
    const db = getDb();
    const times = await db.getAll<{ id: string; reminder_id: string; fire_at: string }>(
      'SELECT id, reminder_id, fire_at FROM reminder_times',
    );
    const reminders = await db.getAll<{ id: string }>('SELECT id FROM reminders');
    const fired: string[] = [];
    const withTimes = new Set<string>();
    for (const time of times) {
      const instant = parseInstant(time.fire_at);
      if (instant && instant.getTime() > now.getTime()) withTimes.add(time.reminder_id);
      else fired.push(time.id);
    }
    const empty = reminders.filter((reminder) => !withTimes.has(reminder.id)).map((r) => r.id);
    if (fired.length === 0 && empty.length === 0) return 0;
    await db.writeTransaction(async (tx) => {
      await tx.execute('DELETE FROM reminder_times WHERE id IN (SELECT value FROM json_each(?))', [
        JSON.stringify(fired),
      ]);
      await tx.execute('DELETE FROM reminders WHERE id IN (SELECT value FROM json_each(?))', [
        JSON.stringify(empty),
      ]);
    });
    return fired.length + empty.length;
  },
};
