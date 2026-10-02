import type { KeyValueStorage } from '../types';

// Navegador / PWA: localStorage. Envuelto en try/catch porque puede no estar
// disponible (modo privado, almacenamiento bloqueado).
export const webStorage: KeyValueStorage = {
  async getItem(key) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  async setItem(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // Sin almacenamiento persistente: la sesión dura lo que dure la pestaña.
    }
  },
  async removeItem(key) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Nada que borrar.
    }
  },
};
