import type { AppLifecycle } from '../types';

// Navegador: el "primer plano" se detecta con la visibilidad de la pestaña.
// No hay botón atrás del sistema ni barras nativas que configurar.
export const webLifecycle: AppLifecycle = {
  onResume(callback) {
    const handler = () => {
      if (document.visibilityState === 'visible') callback();
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  },
  onPause(callback) {
    const handler = () => {
      if (document.visibilityState === 'hidden') callback();
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  },
  onBackButton() {
    return () => undefined;
  },
  async minimize() {
    // No aplica en navegador.
  },
  async setSystemBarsTheme() {
    // No aplica en navegador.
  },
  async hideSplash() {
    // No aplica en navegador.
  },
};
