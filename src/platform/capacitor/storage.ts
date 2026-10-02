import { Preferences } from '@capacitor/preferences';
import type { KeyValueStorage } from '../types';

// Android: almacenamiento nativo (SharedPreferences). Sobrevive aunque el WebView
// limpie su propio almacenamiento por falta de memoria.
export const capacitorStorage: KeyValueStorage = {
  async getItem(key) {
    const { value } = await Preferences.get({ key });
    return value;
  },
  async setItem(key, value) {
    await Preferences.set({ key, value });
  },
  async removeItem(key) {
    await Preferences.remove({ key });
  },
};
