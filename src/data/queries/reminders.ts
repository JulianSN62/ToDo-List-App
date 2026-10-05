import { useQuery } from '@powersync/react';
import { useMemo } from 'react';
import { parseInstant } from '@/lib/dates';
import type { Reminder } from '../types';

// Lecturas reactivas de recordatorios. Solo cuentan las fechas que todavía no pasaron: las
// que pasaron se borran en la próxima reconciliación (notificationSync.ts).

interface ReminderTimeJoinRow {
  reminder_id: string;
  task_id: string;
  message: string | null;
  time_id: string;
  fire_at: string;
}

const JOIN_SQL = `SELECT r.id AS reminder_id, r.task_id, r.message, t.id AS time_id, t.fire_at
                    FROM reminders r
                    JOIN reminder_times t ON t.reminder_id = r.id`;

function upcomingByReminder(rows: readonly ReminderTimeJoinRow[], now: Date): Reminder[] {
  const reminders = new Map<string, Reminder & { sortKey: number }>();
  for (const row of rows) {
    const instant = parseInstant(row.fire_at);
    if (!instant || instant.getTime() <= now.getTime()) continue;
    let reminder = reminders.get(row.reminder_id);
    if (!reminder) {
      reminder = {
        id: row.reminder_id,
        taskId: row.task_id,
        message: row.message,
        times: [],
        sortKey: instant.getTime(),
      };
      reminders.set(row.reminder_id, reminder);
    }
    reminder.times.push({ id: row.time_id, fireAt: instant.toISOString() });
    reminder.sortKey = Math.min(reminder.sortKey, instant.getTime());
  }
  return [...reminders.values()]
    .sort((a, b) => a.sortKey - b.sortKey || a.id.localeCompare(b.id))
    .map((reminder) => ({
      id: reminder.id,
      taskId: reminder.taskId,
      message: reminder.message,
      times: reminder.times.sort((a, b) => a.fireAt.localeCompare(b.fireAt)),
    }));
}

/** Recordatorios de una tarea con sus próximas fechas (el más cercano primero). */
export function useTaskReminders(taskId: string | null): {
  reminders: Reminder[];
  isLoading: boolean;
} {
  const { data, isLoading } = useQuery<ReminderTimeJoinRow>(`${JOIN_SQL} WHERE r.task_id = ?`, [
    taskId ?? '',
  ]);
  return useMemo(
    () => ({ reminders: upcomingByReminder(data, new Date()), isLoading }),
    [data, isLoading],
  );
}

/** Cantidad de recordatorios con fechas pendientes por tarea (indicador de la fila). */
export function useReminderCounts(): Map<string, number> {
  const { data } = useQuery<ReminderTimeJoinRow>(JOIN_SQL);
  return useMemo(() => {
    const counts = new Map<string, number>();
    for (const reminder of upcomingByReminder(data, new Date())) {
      counts.set(reminder.taskId, (counts.get(reminder.taskId) ?? 0) + 1);
    }
    return counts;
  }, [data]);
}
