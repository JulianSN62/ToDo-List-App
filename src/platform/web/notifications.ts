import type { NotificationService } from '../types';

// En web/escritorio no hay notificaciones locales (decisión D13): los recordatorios y las
// tareas ancladas se pueden editar, pero los avisos llegan en la app de Android.
export const webNotifications: NotificationService = {
  isSupported: () => false,
  ensureChannels: async () => undefined,
  getPermission: async () => 'denied',
  requestPermission: async () => 'denied',
  getActive: async () => ({ scheduledIds: [], visibleIds: [] }),
  schedule: async () => undefined,
  cancel: async () => undefined,
  syncPinned: async () => undefined,
  cancelAll: async () => undefined,
  onTap: () => () => undefined,
  onReceived: () => () => undefined,
  sendTest: async () => undefined,
  getDiagnostics: async () => ({
    permission: 'denied',
    exactAlarms: 'unknown',
    battery: 'unknown',
  }),
  openSettings: async () => undefined,
};
