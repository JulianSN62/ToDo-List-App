import { es } from '@/i18n/es';
import { diffInLocalDays, formatLongDate, todayLocalDate } from './dates';
import { dueAlertFireTimes, type DueAlertSettings } from './dueAlerts';
import { normalizeInstant } from './reminders';
import { formatPath, indexById } from './tree';

// Notificaciones locales de Android (spec 9): qué tiene que estar programado según la base
// (conjunto deseado) y qué hay que cambiar en el sistema para llegar a eso (reconciliación).
// Es lógica pura: la capa de datos lee la base y la plataforma programa.

export type NotificationKind = 'due' | 'reminder' | 'pin';
export type NotificationChannelId = 'due_alerts' | 'reminders' | 'pinned';
/**
 * Canal que crea el plugin de notificaciones al arrancar, con el nombre "Default" en inglés.
 * La app no lo usa: se vuelve a crear con un nombre en español para que se vea bien en los
 * ajustes de Android (crear un canal que ya existe solo cambia el nombre y la descripción).
 */
export const PLUGIN_DEFAULT_CHANNEL_ID = 'default';

/** Días hacia adelante que se programan (spec 9.4). El resto, en reconciliaciones posteriores. */
export const SCHEDULE_WINDOW_DAYS = 60;
/** Máximo de notificaciones programadas a la vez (Android limita las alarmas). */
export const MAX_SCHEDULED = 200;
/** ID fijo de la notificación de prueba (fuera del rango que se asigna). */
export const TEST_NOTIFICATION_ID = 2_000_000_000;

const DESCRIPTION_PREVIEW = 120;

export interface NotificationChannelSpec {
  id: NotificationChannelId | typeof PLUGIN_DEFAULT_CHANNEL_ID;
  name: string;
  description: string;
  /** 4 = alta (suena y aparece arriba); 3 = normal; 2 = baja (sin sonido ni vibración). */
  importance: 2 | 3 | 4;
  vibration: boolean;
}

/** Canales de Android (spec 9.3). */
export function notificationChannels(): NotificationChannelSpec[] {
  return [
    {
      id: 'due_alerts',
      name: es.notifications.channelDue,
      description: es.notifications.channelDueDescription,
      importance: 4,
      vibration: true,
    },
    {
      id: 'reminders',
      name: es.notifications.channelReminders,
      description: es.notifications.channelRemindersDescription,
      importance: 4,
      vibration: true,
    },
    {
      id: 'pinned',
      name: es.notifications.channelPinned,
      description: es.notifications.channelPinnedDescription,
      importance: 2,
      vibration: false,
    },
    {
      id: PLUGIN_DEFAULT_CHANNEL_ID,
      name: es.notifications.channelOther,
      description: es.notifications.channelOtherDescription,
      importance: 3,
      vibration: false,
    },
  ];
}

export interface PlannedNotification {
  /** Identifica la notificación entre reconciliaciones: tipo, referencia e instante. */
  key: string;
  kind: NotificationKind;
  /** Tarea (avisos y ancladas) o fecha del recordatorio (reminder_times.id). */
  refId: string;
  taskId: string;
  /** Instante ISO; null = se muestra enseguida (anclada). */
  fireAt: string | null;
  title: string;
  body: string;
  channel: NotificationChannelId;
  /** Resume el contenido: si cambia, se vuelve a programar. */
  signature: string;
}

export interface NotificationTaskSource {
  id: string;
  folderId: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  isDone: boolean;
  isPinned: boolean;
}

export interface NotificationFolderSource {
  id: string;
  parentId: string | null;
  name: string;
}

export interface NotificationReminderSource {
  /** reminder_times.id */
  timeId: string;
  taskId: string;
  message: string | null;
  fireAt: string;
}

export interface NotificationSources {
  /** Tareas no eliminadas (de carpetas no eliminadas). */
  tasks: readonly NotificationTaskSource[];
  folders: readonly NotificationFolderSource[];
  reminders: readonly NotificationReminderSource[];
  dueAlerts: DueAlertSettings;
}

function preview(text: string | null): string {
  const value = (text ?? '').replace(/\s+/g, ' ').trim();
  return value.length > DESCRIPTION_PREVIEW ? `${value.slice(0, DESCRIPTION_PREVIEW - 1)}…` : value;
}

function planned(
  kind: NotificationKind,
  refId: string,
  taskId: string,
  fireAt: string | null,
  title: string,
  body: string,
  channel: NotificationChannelId,
): PlannedNotification {
  return {
    key: `${kind}:${refId}:${fireAt ?? ''}`,
    kind,
    refId,
    taskId,
    fireAt,
    title,
    body,
    channel,
    signature: JSON.stringify([title, body, channel]),
  };
}

/**
 * Conjunto deseado (spec 9.4.1):
 * - avisos de vencimiento de las tareas pendientes con fecha límite (spec 6.6);
 * - fechas futuras de los recordatorios (también de tareas completadas, spec 6.3);
 * - una notificación fija por tarea anclada pendiente.
 * Solo dentro de la ventana de 60 días y hasta 200: las ancladas entran siempre y después
 * las más cercanas.
 */
export function buildDesiredNotifications(
  sources: NotificationSources,
  now: Date = new Date(),
): PlannedNotification[] {
  const today = todayLocalDate(now);
  const limit = now.getTime() + SCHEDULE_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  // La ruta no depende del orden entre hermanas.
  const folders = indexById(sources.folders.map((folder) => ({ ...folder, position: '' })));
  const tasks = new Map(sources.tasks.map((task) => [task.id, task]));
  const pathOf = (task: NotificationTaskSource) => formatPath(task.folderId, folders);
  const inWindow = (date: Date) => date.getTime() > now.getTime() && date.getTime() <= limit;

  const pins: PlannedNotification[] = [];
  const timed: PlannedNotification[] = [];

  for (const task of sources.tasks) {
    if (task.isDone) continue;
    if (task.isPinned) {
      const body = task.dueDate
        ? es.notifications.pinDue(formatLongDate(task.dueDate, today))
        : preview(task.description) || pathOf(task);
      pins.push(planned('pin', task.id, task.id, null, task.title, body, 'pinned'));
    }
    if (task.dueDate) {
      for (const date of dueAlertFireTimes(task.dueDate, sources.dueAlerts, now)) {
        if (!inWindow(date)) continue;
        const days = diffInLocalDays(task.dueDate, todayLocalDate(date));
        timed.push(
          planned(
            'due',
            task.id,
            task.id,
            date.toISOString(),
            es.notifications.dueTitle(days, task.title),
            pathOf(task),
            'due_alerts',
          ),
        );
      }
    }
  }

  for (const reminder of sources.reminders) {
    const task = tasks.get(reminder.taskId);
    const fireAt = normalizeInstant(reminder.fireAt);
    if (!task || !fireAt || !inWindow(new Date(fireAt))) continue;
    const message = reminder.message?.trim() || null;
    const path = pathOf(task);
    timed.push(
      planned(
        'reminder',
        reminder.timeId,
        task.id,
        fireAt,
        message ?? task.title,
        message ? es.notifications.reminderBody(task.title, path) : path,
        'reminders',
      ),
    );
  }

  timed.sort(
    (a, b) => (a.fireAt ?? '').localeCompare(b.fireAt ?? '') || a.key.localeCompare(b.key),
  );
  return [...pins, ...timed].slice(0, Math.max(MAX_SCHEDULED, pins.length));
}

/** Notificación ya programada por la app (tabla solo local notif_registry). */
export interface RegistryEntry {
  key: string;
  notifId: number;
  kind: NotificationKind;
  refId: string;
  taskId: string;
  fireAt: string | null;
  signature: string;
}

/** Lo que el sistema tiene ahora. */
export interface ActiveNotifications {
  /** Programadas con fecha que todavía no salieron. */
  scheduledIds: ReadonlySet<number>;
  /** Visibles en la barra de notificaciones (incluidas las ancladas). */
  visibleIds: ReadonlySet<number>;
}

export interface ScheduledNotification {
  id: number;
  item: PlannedNotification;
}

export interface ReconcilePlan {
  /** Programadas con fecha que ya no corresponden. */
  cancel: number[];
  /** Con fecha: nuevas, cambiadas o perdidas. */
  schedule: ScheduledNotification[];
  /**
   * Todas las ancladas que tienen que verse. Las maneja un plugin propio, que recibe siempre
   * la lista completa: muestra estas y quita las demás (spec 9.6).
   */
  pinned: ScheduledNotification[];
  /** Contenido nuevo del registro. */
  registry: RegistryEntry[];
}

export interface ReconcileOptions {
  /**
   * Vuelve a programar todas las que tienen fecha aunque no hayan cambiado. Se usa al abrir
   * la app (si se forzó la detención, Android borró las alarmas) y al cambiar el permiso de
   * alarmas exactas.
   */
  rescheduleAll?: boolean;
}

/**
 * Diferencias entre el conjunto deseado y lo programado (spec 9.4.2–9.4.3 y 9.4.5):
 * - lo que ya no corresponde se cancela (las ya disparadas quedan en la barra);
 * - lo que cambió de contenido o perdió su alarma se reprograma con el mismo ID;
 * - lo nuevo recibe el menor ID libre (sin pisar ninguno que el sistema esté usando);
 * - las ancladas conservan su ID y van todas en "pinned".
 */
export function planReconcile(
  desired: readonly PlannedNotification[],
  registry: readonly RegistryEntry[],
  active: ActiveNotifications,
  now: Date = new Date(),
  options: ReconcileOptions = {},
): ReconcilePlan {
  const desiredByKey = new Map(desired.map((item) => [item.key, item]));
  const plan: ReconcilePlan = { cancel: [], schedule: [], pinned: [], registry: [] };
  const used = new Set<number>();
  const placed = new Set<string>();

  // Primera pasada: qué entradas siguen (una por clave y por ID, por si el registro
  // quedó con repetidos).
  const kept: { entry: RegistryEntry; item: PlannedNotification }[] = [];
  const dropped: RegistryEntry[] = [];
  for (const entry of registry) {
    const item = desiredByKey.get(entry.key);
    if (!item || placed.has(entry.key) || used.has(entry.notifId)) {
      dropped.push(entry);
      continue;
    }
    used.add(entry.notifId);
    placed.add(entry.key);
    kept.push({ entry, item });
  }

  // Las ancladas que se van las quita el plugin propio (no están en "pinned").
  for (const entry of dropped) {
    // El ID lo sigue usando otra entrada: no se cancela.
    if (used.has(entry.notifId) || entry.kind === 'pin') continue;
    if (entry.fireAt && new Date(entry.fireAt).getTime() > now.getTime()) {
      plan.cancel.push(entry.notifId);
    }
  }

  for (const { entry, item } of kept) {
    plan.registry.push({ ...entry, signature: item.signature });
    if (item.kind === 'pin') {
      plan.pinned.push({ id: entry.notifId, item });
      continue;
    }
    const changed = entry.signature !== item.signature;
    const missing = !active.scheduledIds.has(entry.notifId);
    if (changed || missing || options.rescheduleAll) {
      plan.schedule.push({ id: entry.notifId, item });
    }
  }

  // Programadas por la app que no figuran en el registro (por ejemplo, si no se pudo
  // guardar después de programarlas): se cancelan.
  const known = new Set(registry.map((entry) => entry.notifId));
  for (const id of active.scheduledIds) {
    if (!known.has(id) && id !== TEST_NOTIFICATION_ID) plan.cancel.push(id);
  }

  const taken = new Set<number>([...used, ...active.scheduledIds, ...active.visibleIds]);
  let next = 1;
  for (const item of desired) {
    if (placed.has(item.key)) continue;
    while (taken.has(next) || next === TEST_NOTIFICATION_ID) next += 1;
    taken.add(next);
    placed.add(item.key);
    plan.registry.push({
      key: item.key,
      notifId: next,
      kind: item.kind,
      refId: item.refId,
      taskId: item.taskId,
      fireAt: item.fireAt,
      signature: item.signature,
    });
    if (item.kind === 'pin') plan.pinned.push({ id: next, item });
    else plan.schedule.push({ id: next, item });
  }

  return plan;
}
