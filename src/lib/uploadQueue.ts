// Cola de subida de archivos: qué estado queda después de cada intento y cuándo
// reintentar (spec 10.2). La subida en sí está en src/data/fileSync.ts.

export type UploadStatus = 'pending' | 'uploading' | 'uploaded' | 'failed';

export interface UploadState {
  status: UploadStatus;
  attempts: number;
  /** Instante ISO a partir del cual se puede reintentar, o null para ya. */
  nextAttemptAt: string | null;
  /** Código técnico del último error (nunca datos del archivo). */
  lastError: string | null;
}

export type UploadErrorKind = 'transient' | 'permanent';

export interface UploadFailure {
  kind: UploadErrorKind;
  code: string;
}

export type UploadResult = { ok: true } | { ok: false; failure: UploadFailure };

export const INITIAL_UPLOAD_STATE: UploadState = {
  status: 'pending',
  attempts: 0,
  nextAttemptAt: null,
  lastError: null,
};

// Esperas entre intentos fallidos con conexión: 5 s, 15 s, 30 s, 1 min y después cada 2 min.
const RETRY_DELAYS_MS = [5_000, 15_000, 30_000, 60_000, 120_000];

export function nextAttemptDelay(attempts: number): number {
  const index = Math.min(Math.max(attempts, 1), RETRY_DELAYS_MS.length) - 1;
  return RETRY_DELAYS_MS[index] ?? 120_000;
}

// Errores de Storage que no se arreglan reintentando solos: archivo rechazado, permisos
// o bucket inexistente. Sin código HTTP (falta de red) o con errores del servidor,
// límites de pedidos o sesión vencida (se renueva sola), se reintenta.
export function classifyUploadError(status: number | null | undefined): UploadErrorKind {
  if (status === null || status === undefined || !Number.isFinite(status) || status === 0) {
    return 'transient';
  }
  if (status === 401 || status === 408 || status === 429 || status >= 500) return 'transient';
  if (status >= 400) return 'permanent';
  return 'transient';
}

// Estado después de un intento. Sin conexión no cuenta como intento: se espera
// a que vuelva la red.
export function afterUploadAttempt(
  state: UploadState,
  result: UploadResult,
  { now, online }: { now: Date; online: boolean },
): UploadState {
  if (result.ok) return { status: 'uploaded', attempts: 0, nextAttemptAt: null, lastError: null };
  const { kind, code } = result.failure;
  if (kind === 'permanent') {
    return { status: 'failed', attempts: state.attempts + 1, nextAttemptAt: null, lastError: code };
  }
  if (!online) return { ...state, status: 'pending', nextAttemptAt: null, lastError: code };
  const attempts = state.attempts + 1;
  return {
    status: 'pending',
    attempts,
    nextAttemptAt: new Date(now.getTime() + nextAttemptDelay(attempts)).toISOString(),
    lastError: code,
  };
}

/** "Reintentar": vuelve a la cola para subirse enseguida. */
export function retryNow(): UploadState {
  return { ...INITIAL_UPLOAD_STATE };
}

export function isDue(state: Pick<UploadState, 'status' | 'nextAttemptAt'>, now: Date): boolean {
  if (state.status !== 'pending') return false;
  return state.nextAttemptAt === null || Date.parse(state.nextAttemptAt) <= now.getTime();
}

// Milisegundos hasta el próximo reintento programado (null si no hay ninguno).
export function msUntilNextAttempt(
  states: readonly Pick<UploadState, 'status' | 'nextAttemptAt'>[],
  now: Date,
): number | null {
  let soonest: number | null = null;
  for (const state of states) {
    if (state.status !== 'pending' || state.nextAttemptAt === null) continue;
    const wait = Math.max(0, Date.parse(state.nextAttemptAt) - now.getTime());
    if (soonest === null || wait < soonest) soonest = wait;
  }
  return soonest;
}
