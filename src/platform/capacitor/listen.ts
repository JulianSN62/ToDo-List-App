import type { Unsubscribe } from '../types';

// Los listeners de Capacitor se registran de forma asíncrona;
// esta función permite darlos de baja aunque todavía no terminaron de registrarse.
export function listen(register: () => Promise<{ remove: () => Promise<void> }>): Unsubscribe {
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
