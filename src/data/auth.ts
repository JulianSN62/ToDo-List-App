import { isAuthApiError, isAuthRetryableFetchError, type Session } from '@supabase/supabase-js';
import { loadKnownUser } from './currentUser';
import { clearStoredSession, getSupabase } from './supabaseClient';
import type { CurrentUser } from './types';

// Autenticación passwordless: email + código numérico (OTP, largo en OTP_LENGTH). Nunca magic link.
// Nunca se loguean emails, tokens ni códigos.

export type AuthErrorKind =
  'rateLimited' | 'offline' | 'unavailable' | 'emailFailed' | 'captcha' | 'wrongCode' | 'generic';

export class AuthFlowError extends Error {
  readonly kind: AuthErrorKind;
  constructor(kind: AuthErrorKind) {
    super(kind);
    this.kind = kind;
  }
}

function classify(error: unknown, step: 'request' | 'verify'): AuthErrorKind {
  if (!navigator.onLine) return 'offline';
  // Hay internet pero el servidor no respondió a tiempo (caído, saturado o tardó demasiado
  // enviando el email). No se informa como falta de conexión.
  if (isAuthRetryableFetchError(error)) return 'unavailable';
  if (isAuthApiError(error)) {
    if (error.code === 'over_email_send_rate_limit' || error.code === 'over_request_rate_limit') {
      return 'rateLimited';
    }
    if (error.status === 429) return 'rateLimited';
    if (error.code === 'captcha_failed') return 'captcha';
    // Al pedir el código, un error 5xx casi siempre es una falla del envío del email (SMTP).
    if (step === 'request' && error.status >= 500) return 'emailFailed';
    if (error.code === 'otp_expired' || error.status === 403 || error.status === 401)
      return 'wrongCode';
  }
  return 'generic';
}

// Errores que indican que el email no tiene cuenta. No se muestran para no revelar
// qué emails existen: la pantalla avanza igual al paso del código.
function isUnknownUserError(error: unknown): boolean {
  return (
    isAuthApiError(error) &&
    (error.code === 'otp_disabled' ||
      error.code === 'signup_disabled' ||
      error.code === 'user_not_found')
  );
}

function userFromSession(session: Session): CurrentUser {
  return { id: session.user.id, email: session.user.email ?? '' };
}

export async function requestCode(email: string, captchaToken?: string): Promise<void> {
  const { error } = await getSupabase().auth.signInWithOtp({
    email,
    options: {
      // Sin registro público: nunca se crea un usuario desde la app.
      shouldCreateUser: false,
      captchaToken,
    },
  });
  if (error && !isUnknownUserError(error)) {
    throw new AuthFlowError(classify(error, 'request'));
  }
}

export async function verifyCode(email: string, token: string): Promise<void> {
  const { error } = await getSupabase().auth.verifyOtp({ email, token, type: 'email' });
  if (error) {
    const kind = classify(error, 'verify');
    throw new AuthFlowError(kind === 'generic' ? 'wrongCode' : kind);
  }
}

export type InitialAuth =
  { kind: 'signedIn'; user: CurrentUser } | { kind: 'signedOut'; hadSession: boolean };

// Determina el usuario al abrir la app. Sin conexión y con el token vencido,
// Supabase no puede renovarlo: se usa el último usuario conocido y la app abre igual.
export async function resolveInitialAuth(): Promise<InitialAuth> {
  const known = await loadKnownUser();
  const { data, error } = await getSupabase().auth.getSession();
  if (data.session) return { kind: 'signedIn', user: userFromSession(data.session) };
  if (error && isAuthRetryableFetchError(error) && known) {
    return { kind: 'signedIn', user: known };
  }
  return { kind: 'signedOut', hadSession: known !== null };
}

export type AuthChange = { kind: 'signedIn'; user: CurrentUser } | { kind: 'signedOut' };

// Cambios de sesión: inicio de sesión, renovación de token o cierre confirmado por el servidor.
export function subscribeToAuthChanges(handler: (change: AuthChange) => void): () => void {
  const { data } = getSupabase().auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') {
      handler({ kind: 'signedOut' });
      return;
    }
    if (
      session &&
      (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED')
    ) {
      handler({ kind: 'signedIn', user: userFromSession(session) });
    }
  });
  return () => data.subscription.unsubscribe();
}

// Renovación automática del token según la app esté en primer o segundo plano (Android).
export function setAutoRefresh(active: boolean): void {
  const auth = getSupabase().auth;
  void (active ? auth.startAutoRefresh() : auth.stopAutoRefresh());
}

// Cierra la sesión solo en este dispositivo. Si no hay conexión, borra la sesión local igual.
export async function signOutLocal(): Promise<void> {
  try {
    const { error } = await getSupabase().auth.signOut({ scope: 'local' });
    if (error) await clearStoredSession();
  } catch {
    await clearStoredSession();
  }
}
