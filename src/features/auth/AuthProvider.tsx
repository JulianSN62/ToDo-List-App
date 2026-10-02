import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  clearKnownUser,
  loadKnownUser,
  resolveInitialAuth,
  saveKnownUser,
  setCurrentUser,
  signOutLocal,
  stopSyncAndClear,
  subscribeToAuthChanges,
  type CurrentUser,
} from '@/data';
import { errorMeta, logger } from '@/lib/logger';
import { AuthContext, type AuthState } from './authContext';

// Estado de la sesión. La sesión persiste sin expiración forzada: solo se cierra
// con "Cerrar sesión" o si el servidor confirma que dejó de ser válida.
// Un error de red NUNCA cierra la sesión.
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' });

  const enterSignedIn = useCallback(async (user: CurrentUser) => {
    // Si en este dispositivo había datos de otra cuenta, se borran antes de seguir.
    const known = await loadKnownUser();
    if (known && known.id !== user.id) {
      await stopSyncAndClear().catch(() => undefined);
    }
    setCurrentUser(user);
    await saveKnownUser(user);
    setState((previous) =>
      previous.status === 'signedIn' &&
      previous.user.id === user.id &&
      previous.user.email === user.email
        ? previous
        : { status: 'signedIn', user },
    );
  }, []);

  const enterSignedOut = useCallback(async () => {
    setCurrentUser(null);
    await clearKnownUser();
    // Limpia la base local para no dejar datos de una sesión cerrada.
    await stopSyncAndClear().catch((error: unknown) => {
      logger.warn('No se pudo limpiar la base local', errorMeta(error));
    });
    setState({ status: 'signedOut' });
  }, []);

  useEffect(() => {
    let cancelled = false;

    void resolveInitialAuth()
      .then(async (initial) => {
        if (cancelled) return;
        if (initial.kind === 'signedIn') await enterSignedIn(initial.user);
        else if (initial.hadSession) await enterSignedOut();
        else setState({ status: 'signedOut' });
      })
      .catch((error: unknown) => {
        logger.error('No se pudo leer la sesión', errorMeta(error));
        if (!cancelled) setState({ status: 'signedOut' });
      });

    const unsubscribe = subscribeToAuthChanges((change) => {
      if (change.kind === 'signedIn') void enterSignedIn(change.user);
      else void enterSignedOut();
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [enterSignedIn, enterSignedOut]);

  const signOut = useCallback(async () => {
    await stopSyncAndClear().catch(() => undefined);
    await signOutLocal();
    await enterSignedOut();
  }, [enterSignedOut]);

  const value = useMemo(() => ({ state, signOut }), [state, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
