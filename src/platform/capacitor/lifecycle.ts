import { App } from '@capacitor/app';
import { SystemBars, SystemBarsStyle } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import type { AppLifecycle, Unsubscribe } from '../types';

// Los listeners de Capacitor se registran de forma asíncrona;
// esta función permite darlos de baja aunque todavía no terminaron de registrarse.
function listen(register: () => Promise<{ remove: () => Promise<void> }>): Unsubscribe {
  let removed = false;
  let handle: { remove: () => Promise<void> } | null = null;
  void register().then((result) => {
    if (removed) void result.remove();
    else handle = result;
  });
  return () => {
    removed = true;
    if (handle) void handle.remove();
  };
}

export const capacitorLifecycle: AppLifecycle = {
  onResume(callback) {
    return listen(() =>
      App.addListener('appStateChange', ({ isActive }) => {
        if (isActive) callback();
      }),
    );
  },
  onPause(callback) {
    return listen(() =>
      App.addListener('appStateChange', ({ isActive }) => {
        if (!isActive) callback();
      }),
    );
  },
  onBackButton(callback) {
    return listen(() => App.addListener('backButton', () => callback()));
  },
  async minimize() {
    await App.minimizeApp();
  },
  async setSystemBarsTheme(theme) {
    // Tema oscuro: contenido claro en las barras. Tema claro: contenido oscuro.
    await SystemBars.setStyle({
      style: theme === 'dark' ? SystemBarsStyle.Dark : SystemBarsStyle.Light,
    });
  },
  async hideSplash() {
    await SplashScreen.hide();
  },
};
