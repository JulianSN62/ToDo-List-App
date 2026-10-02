import { useEffect, useRef } from 'react';
import { runStartupCleanup, setAutoRefresh, startSync, useHasSynced } from '@/data';
import { lifecycle, platform } from '@/platform';

// Efectos mientras hay una sesión iniciada: sincronización, limpieza local
// y renovación del token según la app esté en primer o segundo plano.
export function SessionEffects({ userId }: { userId: string }) {
  const hasSynced = useHasSynced();
  const cleanedAfterFirstSync = useRef(false);

  useEffect(() => {
    void startSync();
    void runStartupCleanup();
  }, [userId]);

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
