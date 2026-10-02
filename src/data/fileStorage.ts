import { getSupabase } from './supabaseClient';

// Archivos en Supabase Storage (bucket privado "attachments", spec 5.4).
// Las políticas del bucket solo dejan tocar la carpeta del propio usuario.

const BUCKET = 'attachments';
// Las descargas usan una URL firmada de corta duración (spec 10.2).
const SIGNED_URL_SECONDS = 60;

export class RemoteFileError extends Error {
  /** Código HTTP, o null si no hubo respuesta (sin conexión). */
  readonly status: number | null;

  constructor(status: number | null) {
    super(status === null ? 'Sin respuesta de Storage' : `Storage respondió ${status}`);
    this.name = 'RemoteFileError';
    this.status = status;
  }

  get code(): string {
    return this.status === null ? 'network' : String(this.status);
  }

  /** El archivo no está en Storage (por ejemplo, todavía se está subiendo desde otro dispositivo). */
  get notFound(): boolean {
    return this.status === 404;
  }
}

// Storage informa el código real en "statusCode" (a veces con HTTP 400) y el HTTP en "status".
function statusOf(error: unknown): number | null {
  if (!error || typeof error !== 'object') return null;
  const { status, statusCode } = error as { status?: unknown; statusCode?: unknown };
  const fromBody = typeof statusCode === 'string' ? Number.parseInt(statusCode, 10) : NaN;
  if (Number.isInteger(fromBody) && fromBody >= 400) return fromBody;
  return typeof status === 'number' && status > 0 ? status : null;
}

export async function uploadRemoteFile(
  path: string,
  data: Blob,
  contentType: string,
): Promise<void> {
  let error: unknown;
  try {
    // upsert: reintentar una subida que en realidad había terminado no falla.
    ({ error } = await getSupabase()
      .storage.from(BUCKET)
      .upload(path, data, { contentType, upsert: true }));
  } catch (caught) {
    error = caught;
  }
  if (error) throw new RemoteFileError(statusOf(error));
}

export async function downloadRemoteFile(path: string): Promise<Blob> {
  let signedUrl: string;
  try {
    const { data, error } = await getSupabase()
      .storage.from(BUCKET)
      .createSignedUrl(path, SIGNED_URL_SECONDS);
    if (error || !data) throw new RemoteFileError(statusOf(error));
    signedUrl = data.signedUrl;
  } catch (caught) {
    throw caught instanceof RemoteFileError ? caught : new RemoteFileError(statusOf(caught));
  }
  let response: Response;
  try {
    response = await fetch(signedUrl);
  } catch {
    throw new RemoteFileError(null);
  }
  if (!response.ok) throw new RemoteFileError(response.status);
  return response.blob();
}
