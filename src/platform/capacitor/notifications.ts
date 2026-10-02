import type { NotificationService } from '../types';

// Implementación pendiente (Fase 8): avisos de vencimiento, recordatorios y tareas ancladas
// con @capacitor/local-notifications. Por ahora no programa nada.
export const capacitorNotifications: NotificationService = {
  isSupported: () => false,
  getPermissionState: async () => 'prompt',
  requestPermission: async () => false,
  reconcile: async () => undefined,
  sendTest: async () => undefined,
  getDiagnostics: async () => ({
    permission: 'prompt',
    exactAlarms: 'unknown',
    batteryOptimization: 'unknown',
  }),
};
