import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import {
  runStartupCleanup,
  setAutoRefresh,
  startFileSync,
  startNotificationSync,
  startSync,
  stopFileSync,
  stopNotificationSync,
  useHasSynced,
} from '@/data';
import { errorMeta, logger } from '@/lib/logger';
import { lifecycle, notifications, platform } from '@/platform';

// Efectos mientras hay una sesión iniciada: sincronización, subida de archivos,
// notificaciones, limpieza local y renovación del token según la app esté en primer
// o segundo plano.
export function SessionEffects({ userId }: { userId: string }) {
  const hasSynced = useHasSynced();
  const cleanedAfterFirstSync = useRef(false);
  const navigate = useNavigate();

  useEffect(() => {
    void startSync();
    void runStartupCleanup();
    // Cola de subida de archivos adjuntos (se corta al cerrar sesión).
    startFileSync();
    return () => {
      stopFileSync().catch((error: unknown) => {
        logger.warn('No se pudo detener la subida de archivos', errorMeta(error));
      });
    };
  }, [userId]);

  // Avisos de vencimiento, recordatorios y tareas ancladas (spec 9). En web solo borra las
  // fechas de recordatorio que ya pasaron.
  useEffect(() => {
    startNotificationSync();
    return () => {
      stopNotificationSync().catch((error: unknown) => {
        logger.warn('No se pudo detener la reconciliación de avisos', errorMeta(error));
      });
    };
  }, [userId]);

  // Tocar una notificación abre la tarea (spec 9.1).
  useEffect(
    () => notifications.onTap((taskId) => void navigate(`/task/${encodeURIComponent(taskId)}`)),
    [navigate],
  );

  // La primera vez que llega la configuración del servidor se vuelve a limpiar.
  useEffect(() => {
    if (hasSynced && !cleanedAfterFirstSync.current) {
      cleanedAfterFirstSync.current = true;
      void runStartupCleanup();
    }
  }, [hasSynced]);

  useEffect(() => {
    if (!platform.isNative) return;
    const stopResume = lifecycle.onResume(() => setAutoRefresh(true));
    const stopPause = lifecycle.onPause(() => setAutoRefresh(false));
    return () => {
      stopResume();
      stopPause();
    };
  }, []);

  return null;
}
