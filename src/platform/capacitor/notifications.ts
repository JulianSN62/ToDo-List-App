import { registerPlugin, type PluginListenerHandle } from '@capacitor/core';
import { LocalNotifications, type LocalNotificationSchema } from '@capacitor/local-notifications';
import type {
  LocalNotificationRequest,
  NotificationPermission,
  NotificationService,
  PinnedNotificationRequest,
} from '../types';
import { listen } from './listen';

// Notificaciones locales con @capacitor/local-notifications 8.3 (spec 9).
// - Las programadas usan una alarma exacta si Android lo permite; si no, una inexacta (nunca
//   se abre la pantalla de permisos al programar: eso lo decide el usuario en Diagnóstico).
// - Las ancladas las maneja un plugin propio (PinnedNotifications.java, spec 9.6 Opción 2): el
//   plugin oficial no las guarda, así que no volverían al reiniciar el teléfono.

/** Plugin propio (android/app/.../DeviceSettingsPlugin.java): batería y ajustes del sistema. */
interface DeviceSettingsPlugin {
  isIgnoringBatteryOptimizations(): Promise<{ value: boolean }>;
  openBatterySettings(): Promise<void>;
  openNotificationSettings(): Promise<void>;
}

/** Plugin propio (android/app/.../PinnedNotificationsPlugin.java): tareas ancladas. */
interface PinnedNotificationsPlugin {
  sync(options: { items: PinnedNotificationRequest[] }): Promise<void>;
  addListener(
    eventName: 'tap',
    listener: (event: { taskId: string }) => void,
  ): Promise<PluginListenerHandle>;
}

const DeviceSettings = registerPlugin<DeviceSettingsPlugin>('DeviceSettings');
const PinnedNotifications = registerPlugin<PinnedNotificationsPlugin>('PinnedNotifications');

function toPermission(state: string): NotificationPermission {
  if (state === 'granted') return 'granted';
  if (state === 'denied') return 'denied';
  return 'prompt';
}

async function exactAlarmsAllowed(): Promise<boolean> {
  try {
    return (await LocalNotifications.checkExactNotificationSetting()).exact_alarm === 'granted';
  } catch {
    return false;
  }
}

function toSchema(item: LocalNotificationRequest, exact: boolean): LocalNotificationSchema {
  return {
    id: item.id,
    title: item.title,
    body: item.body,
    largeBody: item.body,
    channelId: item.channelId,
    extra: { taskId: item.taskId },
    autoCancel: true,
    schedule: { at: item.at, allowWhileIdle: true },
    isExactNotification: exact,
  };
}

export const capacitorNotifications: NotificationService = {
  isSupported: () => true,

  async ensureChannels(channels) {
    for (const channel of channels) {
      await LocalNotifications.createChannel({
        id: channel.id,
        name: channel.name,
        description: channel.description,
        importance: channel.importance,
        vibration: channel.vibration,
      });
    }
  },

  async getPermission() {
    return toPermission((await LocalNotifications.checkPermissions()).display);
  },

  async requestPermission() {
    return toPermission((await LocalNotifications.requestPermissions()).display);
  },

  async getActive() {
    const [scheduled, delivered] = await Promise.all([
      LocalNotifications.getAll({ state: 'SCHEDULED' }),
      LocalNotifications.getDeliveredNotifications(),
    ]);
    return {
      scheduledIds: scheduled.notifications.map((notification) => notification.id),
      visibleIds: delivered.notifications.map((notification) => notification.id),
    };
  },

  async schedule(items) {
    if (items.length === 0) return;
    const exact = await exactAlarmsAllowed();
    await LocalNotifications.schedule({
      notifications: items.map((item) => toSchema(item, exact)),
    });
  },

  async cancel(ids) {
    if (ids.length === 0) return;
    await LocalNotifications.cancel({ notifications: ids.map((id) => ({ id })) });
  },

  async syncPinned(items) {
    await PinnedNotifications.sync({ items: [...items] });
  },

  async cancelAll() {
    await PinnedNotifications.sync({ items: [] });
    await LocalNotifications.cancelAll();
    await LocalNotifications.removeAllDeliveredNotifications();
  },

  onTap(callback) {
    const stopTimed = listen(() =>
      LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
        const extra: unknown = action.notification?.extra;
        const taskId =
          extra && typeof extra === 'object' && 'taskId' in extra ? extra.taskId : undefined;
        if (typeof taskId === 'string' && taskId) callback(taskId);
      }),
    );
    const stopPinned = listen(() =>
      PinnedNotifications.addListener('tap', (event) => {
        if (event.taskId) callback(event.taskId);
      }),
    );
    return () => {
      stopTimed();
      stopPinned();
    };
  },

  onReceived(callback) {
    return listen(() => LocalNotifications.addListener('localNotificationReceived', callback));
  },

  async sendTest(content) {
    // Con la hora actual sale enseguida y queda como "ya disparada" (no vuelve al reiniciar).
    await LocalNotifications.schedule({
      notifications: [
        {
          id: content.id,
          title: content.title,
          body: content.body,
          channelId: content.channelId,
          schedule: { at: new Date() },
          isExactNotification: false,
        },
      ],
    });
  },

  async getDiagnostics() {
    const permission = toPermission((await LocalNotifications.checkPermissions()).display);
    const exactAlarms = (await exactAlarmsAllowed()) ? 'granted' : 'denied';
    let battery: 'unrestricted' | 'optimized' | 'unknown' = 'unknown';
    try {
      battery = (await DeviceSettings.isIgnoringBatteryOptimizations()).value
        ? 'unrestricted'
        : 'optimized';
    } catch {
      // Sin el plugin propio (no debería pasar en Android): se muestra como desconocido.
    }
    return { permission, exactAlarms, battery };
  },

  async openSettings(target) {
    if (target === 'exactAlarms') await LocalNotifications.changeExactNotificationSetting();
    else if (target === 'battery') await DeviceSettings.openBatterySettings();
    else await DeviceSettings.openNotificationSettings();
  },
};
