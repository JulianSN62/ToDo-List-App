import type { NotificationService } from '../types';

// En web/escritorio no hay recordatorios ni tareas ancladas (decisión D13).
export const webNotifications: NotificationService = {
  isSupported: () => false,
  getPermissionState: async () => 'denied',
  requestPermission: async () => false,
  reconcile: async () => undefined,
  sendTest: async () => undefined,
  getDiagnostics: async () => ({
    permission: 'denied',
    exactAlarms: 'unknown',
    batteryOptimization: 'unknown',
  }),
};
