import { LIMITS } from './validation';

// Archivos adjuntos: límite de tamaño, nombres, ruta en Storage y plan de compresión
// de imágenes (spec 5.4 y 10.2).

/** 10 MB. Coincide con el CHECK attachments_size_check y con el límite del bucket. */
export const MAX_FILE_BYTES = 10 * 1024 * 1024;

/** Lado mayor de una foto después de comprimirla. */
export const IMAGE_MAX_SIDE = 1600;
export const IMAGE_QUALITY = 0.8;

export const FALLBACK_MIME_TYPE = 'application/octet-stream';
const FALLBACK_BASE_NAME = 'archivo';
// Largo máximo del nombre dentro de la ruta de Storage (sin el id del adjunto).
const STORAGE_NAME_MAX = 100;

export type FileKind = 'image' | 'pdf' | 'other';

// Imágenes que cualquier navegador muestra con <img> (HEIC, por ejemplo, no).
const PREVIEWABLE_IMAGES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
  'image/bmp',
  'image/svg+xml',
]);

const MIME_PATTERN = /^[a-z0-9][a-z0-9!#$&^_.+-]*\/[a-z0-9][a-z0-9!#$&^_.+-]*$/;

// Tipo MIME listo para guardar: en minúsculas, sin parámetros y con un valor por defecto.
export function normalizeMimeType(raw: string | null | undefined): string {
  const value = (raw ?? '').split(';')[0]?.trim().toLowerCase() ?? '';
  if (!value || value.length > LIMITS.mimeType || !MIME_PATTERN.test(value)) {
    return FALLBACK_MIME_TYPE;
  }
  return value;
}

// Extensión: lo que sigue al último punto, si son solo letras y números (hasta 10).
export function splitExtension(name: string): { base: string; extension: string } {
  const dot = name.lastIndexOf('.');
  const extension = dot > 0 ? name.slice(dot + 1) : '';
  if (!/^[A-Za-z0-9]{1,10}$/.test(extension)) return { base: name, extension: '' };
  return { base: name.slice(0, dot), extension };
}

export function fileKind(mimeType: string, name = ''): FileKind {
  const mime = normalizeMimeType(mimeType);
  if (PREVIEWABLE_IMAGES.has(mime)) return 'image';
  if (mime === 'application/pdf') return 'pdf';
  if (mime === FALLBACK_MIME_TYPE && splitExtension(name).extension.toLowerCase() === 'pdf') {
    return 'pdf';
  }
  return 'other';
}

// Nombre que se muestra y se guarda en la fila: sin caracteres de control ni barras,
// recortado al límite de la base y conservando la extensión.
export function displayFileName(raw: string): string {
  const cleaned = raw
    .replace(/[\p{Cc}\p{Cf}]/gu, '')
    .replace(/[\\/]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return FALLBACK_BASE_NAME;
  if (cleaned.length <= LIMITS.fileName) return cleaned;
  const { base, extension } = splitExtension(cleaned);
  if (!extension) return cleaned.slice(0, LIMITS.fileName);
  return `${base.slice(0, LIMITS.fileName - extension.length - 1).trimEnd()}.${extension}`;
}

// Nombre seguro para la ruta en Storage: sin tildes, solo [A-Za-z0-9._-].
export function sanitizeFileName(raw: string): string {
  const ascii = raw.normalize('NFD').replace(/\p{Diacritic}/gu, '');
  const { base, extension } = splitExtension(ascii);
  const safeExtension = extension.toLowerCase();
  const maxBase = STORAGE_NAME_MAX - (safeExtension ? safeExtension.length + 1 : 0);
  const safeBase =
    base
      .replace(/[^A-Za-z0-9._-]+/g, '-')
      .replace(/-{2,}/g, '-')
      .replace(/^[-.]+|[-.]+$/g, '')
      .slice(0, maxBase)
      .replace(/[-.]+$/, '') || FALLBACK_BASE_NAME;
  return safeExtension ? `${safeBase}.${safeExtension}` : safeBase;
}

/** Ruta del objeto en el bucket: {owner_id}/{task_id}/{attachment_id}-{nombre}. */
export function buildStoragePath(
  ownerId: string,
  taskId: string,
  attachmentId: string,
  fileName: string,
): string {
  return `${ownerId}/${taskId}/${attachmentId}-${sanitizeFileName(fileName)}`;
}

export function renameExtension(name: string, extension: string): string {
  const { base } = splitExtension(name);
  return `${base}.${extension}`;
}

export interface ImageCompressionPlan {
  outputType: 'image/jpeg' | 'image/webp';
  quality: number;
  maxSide: number;
}

// Qué hacer con una imagen antes de subirla. null: se sube tal cual
// (GIF puede tener animación, SVG es texto, HEIC no se puede leer en el navegador).
export function compressionPlan(mimeType: string): ImageCompressionPlan | null {
  const mime = normalizeMimeType(mimeType);
  if (mime === 'image/jpeg') {
    return { outputType: 'image/jpeg', quality: IMAGE_QUALITY, maxSide: IMAGE_MAX_SIDE };
  }
  // WebP conserva la transparencia de los PNG.
  if (mime === 'image/png' || mime === 'image/webp') {
    return { outputType: 'image/webp', quality: IMAGE_QUALITY, maxSide: IMAGE_MAX_SIDE };
  }
  return null;
}

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/png': 'png',
};

export function extensionForType(mimeType: string): string | null {
  return EXTENSIONS[normalizeMimeType(mimeType)] ?? null;
}

// Medidas para que el lado mayor no supere maxSide, sin agrandar ni deformar.
export function fitWithin(
  width: number,
  height: number,
  maxSide: number,
): { width: number; height: number; resized: boolean } {
  const largest = Math.max(width, height);
  if (largest <= maxSide || largest <= 0) return { width, height, resized: false };
  const scale = maxSide / largest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
    resized: true,
  };
}

// La versión comprimida solo se usa si quedó más liviana que la original.
export function keepCompressed(originalBytes: number, compressedBytes: number): boolean {
  return compressedBytes > 0 && compressedBytes < originalBytes;
}

export function isWithinSizeLimit(bytes: number): boolean {
  return bytes >= 0 && bytes <= MAX_FILE_BYTES;
}

const SIZE_UNITS = ['KB', 'MB', 'GB'] as const;

// "820 B", "12 KB", "1,5 MB", "10,2 MB" (base 1024, como el límite de 10 MB).
export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 1024) return `${Math.max(0, Math.round(bytes || 0))} B`;
  let value = bytes;
  let unit: (typeof SIZE_UNITS)[number] = 'KB';
  for (const candidate of SIZE_UNITS) {
    value /= 1024;
    unit = candidate;
    if (value < 1024) break;
  }
  // Un decimal en MB y GB, para que 10,2 MB no se lea igual que el límite de 10 MB.
  const digits = value < 100 && unit !== 'KB' ? 1 : 0;
  const text = new Intl.NumberFormat('es-AR', {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  }).format(value);
  return `${text} ${unit}`;
}
