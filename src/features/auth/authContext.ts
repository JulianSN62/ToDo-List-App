import { createContext, useContext } from 'react';
import type { CurrentUser } from '@/data';

export type AuthState =
  { status: 'loading' } | { status: 'signedOut' } | { status: 'signedIn'; user: CurrentUser };

export interface AuthContextValue {
  state: AuthState;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return context;
}

// Usuario actual; solo para pantallas protegidas (siempre hay sesión).
export function useCurrentUser(): CurrentUser {
  const { state } = useAuth();
  if (state.status !== 'signedIn') throw new Error('No hay sesión iniciada');
  return state.user;
}
