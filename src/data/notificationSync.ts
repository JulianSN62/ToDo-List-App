import { parseInstant } from '@/lib/dates';
import { errorMeta, logger } from '@/lib/logger';
import {
  buildDesiredNotifications,
  notificationChannels,
  planReconcile,
  type NotificationKind,
  type NotificationSources,
  type RegistryEntry,
} from '@/lib/notificationPlan';
import { lifecycle, notifications } from '@/platform';
import { getCurrentUser } from './currentUser';
import { getDb } from './db';
import { toSettings } from './mappers';
import { reminderRepo } from './repositories/reminderRepo';
import type { UserSettingsRow } from './schema';

// Reconciliación de notificaciones (spec 9.4). Mientras hay una sesión:
// 1. borra las fechas de recordatorio que ya pasaron (en cualquier plataforma);
// 2. en Android, compara lo que tiene que estar programado con lo que hay y lo corrige.
// Corre al iniciar, al volver a primer plano, después de cada cambio en tareas, carpetas,
// recordatorios o ajustes (también los que llegan por sincronización) y cuando se dispara
// una fecha de recordatorio con la app abierta. Las ejecuciones van de a una.

const WATCHED_TABLES = ['tasks', 'folders', 'reminders', 'reminder_times', 'user_settings'];
const DEBOUNCE_MS = 500;
// setTimeout no admite esperas de más de ~24 días; con un día alcanza.
const MAX_WAIT_MS = 24 * 60 * 60 * 1000;

let running = false;
let active: Promise<void> | null = null;
let runAgain = false;
let debounceTimer: number | null = null;
let nextTimer: number | null = null;
let stopListeners: (() => void)[] = [];
// La primera reconciliación de la sesión vuelve a programar todo: si se forzó la
// detención de la app, Android borró las alarmas pero el plugin las sigue listando.
let firstReconcile = true;
// Si cambia el permiso de alarmas exactas, se reprograma todo (las ya programadas quedaron
// exactas o inexactas según el permiso que había).
let lastExactAlarms: string | null = null;

async function readSources(): Promise<NotificationSources> {
  const db = getDb();
  const userId = getCurrentUser()?.id ?? '';
  const [tasks, folders, reminders, settings] = await Promise.all([
    db.getAll<{
      id: string;
      folder_id: string;
      title: string | null;
      description: string | null;
      due_date: string | null;
      is_done: number | null;
      is_pinned: number | null;
    }>(
      `SELECT t.id, t.folder_id, t.title, t.description, t.due_date, t.is_done, t.is_pinned
         FROM tasks t
         JOIN folders f ON f.id = t.folder_id
        WHERE t.deleted_at IS NULL AND f.deleted_at IS NULL`,
    ),
    db.getAll<{ id: string; parent_id: string | null; name: string | null }>(
      'SELECT id, parent_id, name FROM folders WHERE deleted_at IS NULL',
    ),
    db.getAll<{ time_id: string; task_id: string; message: string | null; fire_at: string }>(
      `SELECT rt.id AS time_id, rt.task_id, r.message, rt.fire_at
         FROM reminder_times rt
         JOIN reminders r ON r.id = rt.reminder_id`,
    ),
    db.getOptional<UserSettingsRow>('SELECT * FROM user_settings WHERE owner_id = ? LIMIT 1', [
      userId,
    ]),
  ]);
  const stored = toSettings(settings);
  return {
    tasks: tasks.map((task) => ({
      id: task.id,
      folderId: task.folder_id,
      title: task.title ?? '',
      description: task.description,
      dueDate: task.due_date,
      isDone: task.is_done === 1,
      isPinned: task.is_pinned === 1,
    })),
    folders: folders.map((folder) => ({
      id: folder.id,
      parentId: folder.parent_id,
      name: folder.name ?? '',
    })),
    reminders: reminders.map((reminder) => ({
      timeId: reminder.time_id,
      taskId: reminder.task_id,
      message: reminder.message,
      fireAt: reminder.fire_at,
    })),
    dueAlerts: {
      enabled: stored.dueAlertsEnabled,
      offsets: stored.dueAlertOffsets,
      time: stored.dueAlertTime,
    },
  };
}

async function readRegistry(): Promise<RegistryEntry[]> {
  const rows = await getDb().getAll<{
    id: string;
    notif_id: number;
    kind: string;
    ref_id: string;
    task_id: string;
    fire_at: string | null;
    signature: string | null;
  }>('SELECT * FROM notif_registry');
  return rows.map((row) => ({
    key: row.id,
    notifId: row.notif_id,
    kind: row.kind as NotificationKind,
    refId: row.ref_id,
    taskId: row.task_id,
    fireAt: row.fire_at,
    signature: row.signature ?? '',
  }));
}

async function writeRegistry(entries: readonly RegistryEntry[]): Promise<void> {
  await getDb().writeTransaction(async (tx) => {
    await tx.execute('DELETE FROM notif_registry');
    for (const entry of entries) {
      await tx.execute(
        `INSERT INTO notif_registry (id, notif_id, kind, ref_id, task_id, fire_at, signature)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          entry.key,
          entry.notifId,
          entry.kind,
          entry.refId,
          entry.taskId,
          entry.fireAt,
          entry.signature,
        ],
      );
    }
  });
}

async function reconcileNotifications(now: Date): Promise<void> {
  const { permission, exactAlarms } = await notifications.getDiagnostics();
  const exactChanged = lastExactAlarms !== null && lastExactAlarms !== exactAlarms;
  lastExactAlarms = exactAlarms;
  // Sin permiso no se programa nada (y se cancela lo que hubiera): al darlo, se programa todo.
  const desired =
    permission === 'granted' ? buildDesiredNotifications(await readSources(), now) : [];
  const registry = await readRegistry();
  const current = await notifications.getActive();
  const plan = planReconcile(
    desired,
    registry,
    { scheduledIds: new Set(current.scheduledIds), visibleIds: new Set(current.visibleIds) },
    now,
    { rescheduleAll: permission === 'granted' && (firstReconcile || exactChanged) },
  );
  await notifications.cancel(plan.cancel);
  await notifications.schedule(
    plan.schedule.flatMap(({ id, item }) =>
      item.fireAt
        ? [
            {
              id,
              title: item.title,
              body: item.body,
              channelId: item.channel,
              at: new Date(item.fireAt),
              taskId: item.taskId,
            },
          ]
        : [],
    ),
  );
  await notifications.syncPinned(
    plan.pinned.map(({ id, item }) => ({
      id,
      title: item.title,
      body: item.body,
      taskId: item.taskId,
    })),
  );
  await writeRegistry(plan.registry);
  if (permission === 'granted') firstReconcile = false;
}

// Vuelve a correr cuando pase la próxima fecha de recordatorio, para borrarla.
async function scheduleNextRun(now: Date): Promise<void> {
  if (nextTimer !== null) window.clearTimeout(nextTimer);
  nextTimer = null;
  if (!running) return;
  const rows = await getDb().getAll<{ fire_at: string }>('SELECT fire_at FROM reminder_times');
  let next: number | null = null;
  for (const row of rows) {
    const time = parseInstant(row.fire_at)?.getTime();
    if (time !== undefined && time > now.getTime() && (next === null || time < next)) next = time;
  }
  if (next === null || !running) return;
  const wait = Math.min(next - now.getTime() + 1000, MAX_WAIT_MS);
  nextTimer = window.setTimeout(trigger, wait);
}

async function run(): Promise<void> {
  const now = new Date();
  await reminderRepo.deleteFired(now);
  if (notifications.isSupported()) await reconcileNotifications(now);
  await scheduleNextRun(now);
}

function execute(): void {
  if (!running) return;
  if (active) {
    runAgain = true;
    return;
  }
  active = run()
    .catch((error: unknown) => logger.warn('Falló la reconciliación de avisos', errorMeta(error)))
    .finally(() => {
      active = null;
      if (runAgain) {
        runAgain = false;
        execute();
      }
    });
}

// Espera a que se calmen los cambios seguidos (spec 9.4: "debounce" de unos 500 ms).
function trigger(): void {
  if (!running) return;
  if (debounceTimer !== null) window.clearTimeout(debounceTimer);
  debounceTimer = window.setTimeout(() => {
    debounceTimer = null;
    execute();
  }, DEBOUNCE_MS);
}

export function startNotificationSync(): void {
  if (running) return;
  running = true;
  firstReconcile = true;
  lastExactAlarms = null;
  if (notifications.isSupported()) {
    notifications.ensureChannels(notificationChannels()).catch((error: unknown) => {
      logger.warn('No se pudieron crear los canales de notificación', errorMeta(error));
    });
  }
  const unsubscribe = getDb().onChange(
    { onChange: () => trigger() },
    { tables: WATCHED_TABLES, throttleMs: DEBOUNCE_MS },
  );
  stopListeners = [unsubscribe, lifecycle.onResume(trigger), notifications.onReceived(trigger)];
  trigger();
}

/** Corta la reconciliación (al cerrar sesión). Espera a que termine la que está en curso. */
export async function stopNotificationSync(): Promise<void> {
  running = false;
  runAgain = false;
  for (const timer of [debounceTimer, nextTimer]) {
    if (timer !== null) window.clearTimeout(timer);
  }
  debounceTimer = null;
  nextTimer = null;
  for (const stop of stopListeners) stop();
  stopListeners = [];
  await active?.catch(() => undefined);
}

/** Vuelve a reconciliar enseguida (por ejemplo, al volver de los ajustes de Android). */
export function wakeNotificationSync(): void {
  trigger();
}

/** Cancela y quita todas las notificaciones de la app (al cerrar sesión). */
export async function clearNotifications(): Promise<void> {
  if (!notifications.isSupported()) return;
  await notifications.cancelAll();
}
