import { App } from '@capacitor/app';
import { SystemBars, SystemBarsStyle } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import type { AppLifecycle } from '../types';
import { listen } from './listen';

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
