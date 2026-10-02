import { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { es } from '@/i18n/es';
import { errorMeta, logger } from '@/lib/logger';
import { dismissToast, showPersistentActionToast, showToast } from '@/ui/toast';

const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000;

// Registra el service worker de la PWA (solo navegador, nunca en Android)
// y avisa cuando hay una versión nueva en lugar de recargar sola.
export function PwaUpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      window.setInterval(() => {
        void registration.update().catch(() => undefined);
      }, UPDATE_CHECK_INTERVAL_MS);
    },
    onRegisterError(error: unknown) {
      logger.warn('No se pudo registrar el service worker', errorMeta(error));
    },
  });

  useEffect(() => {
    if (!offlineReady) return;
    showToast(es.pwa.offlineReady);
    setOfflineReady(false);
  }, [offlineReady, setOfflineReady]);

  useEffect(() => {
    if (!needRefresh) return;
    const id = showPersistentActionToast(
      es.pwa.updateAvailable,
      es.pwa.update,
      () => void updateServiceWorker(true),
      () => setNeedRefresh(false),
    );
    return () => dismissToast(id);
  }, [needRefresh, setNeedRefresh, updateServiceWorker]);

  return null;
}
