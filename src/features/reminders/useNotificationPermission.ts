import { useCallback } from 'react';
import { useNavigate } from 'react-router';
import { wakeNotificationSync } from '@/data';
import { es } from '@/i18n/es';
import { errorMeta, logger } from '@/lib/logger';
import { notifications } from '@/platform';
import { showActionToast } from '@/ui/toast';

// Pide el permiso de notificaciones en el momento oportuno (spec 9.5): al activar las alertas,
// agregar un recordatorio o anclar una tarea. Solo en Android: en Android 13 o más aparece el
// pedido del sistema; en Android 12 el permiso ya viene dado, salvo que se haya apagado.
// Si no hay permiso, un aviso lleva a Ajustes → Notificaciones.
export function useNotificationPermission(): () => void {
  const navigate = useNavigate();
  return useCallback(() => {
    if (!notifications.isSupported()) return;
    void (async () => {
      try {
        let permission = await notifications.getPermission();
        if (permission === 'prompt') permission = await notifications.requestPermission();
        if (permission === 'granted') {
          wakeNotificationSync();
          return;
        }
        showActionToast(es.reminders.permissionDenied, es.reminders.permissionAction, () => {
          void navigate('/settings/notifications');
        });
      } catch (error) {
        logger.warn('No se pudo pedir el permiso de notificaciones', errorMeta(error));
      }
    })();
  }, [navigate]);
}
