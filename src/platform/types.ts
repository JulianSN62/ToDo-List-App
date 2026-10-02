// Contratos de la capa de plataforma. La UI solo conoce estas interfaces:
// hay una implementación para navegador (web/) y otra para Android (capacitor/).
// Una futura versión de escritorio con Tauri solo necesitaría agregar platform/tauri/.

export interface PlatformInfo {
  /** true solo dentro de la app nativa (Capacitor) */
  isNative: boolean;
  isAndroid: boolean;
}

/** Almacenamiento clave-valor persistente (sesión, preferencias del dispositivo). */
export interface KeyValueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export type Unsubscribe = () => void;

/** Ciclo de vida de la app y botón "atrás" del sistema. */
export interface AppLifecycle {
  onResume(callback: () => void): Unsubscribe;
  onPause(callback: () => void): Unsubscribe;
  /** Solo Android: el handler reemplaza el comportamiento por defecto del botón atrás. */
  onBackButton(callback: () => void): Unsubscribe;
  minimize(): Promise<void>;
  /** Barras del sistema acordes al tema (texto claro u oscuro). */
  setSystemBarsTheme(theme: 'light' | 'dark'): Promise<void>;
  hideSplash(): Promise<void>;
}

/** Abre links externos fuera de la app (pestaña nueva en web, navegador en Android). */
export interface ExternalLinkService {
  open(url: string): Promise<void>;
}

export type NotificationKind = 'due' | 'reminder' | 'pin';

export interface DesiredNotification {
  kind: NotificationKind;
  refId: string;
  taskId: string;
  fireAt: string | null;
  title: string;
  body: string;
}

export interface DesiredNotifications {
  items: DesiredNotification[];
}

export interface NotificationDiagnostics {
  permission: 'granted' | 'denied' | 'prompt';
  exactAlarms: 'granted' | 'denied' | 'unknown';
  batteryOptimization: 'ok' | 'warning' | 'unknown';
}

/** Notificaciones locales. Se implementa en Android en la Fase 8; en web no hace nada. */
export interface NotificationService {
  isSupported(): boolean;
  getPermissionState(): Promise<'granted' | 'denied' | 'prompt'>;
  requestPermission(): Promise<boolean>;
  /** Recalcula y sincroniza TODAS las notificaciones locales con el estado de la base. */
  reconcile(desired: DesiredNotifications): Promise<void>;
  sendTest(): Promise<void>;
  getDiagnostics(): Promise<NotificationDiagnostics>;
}

export interface PickedFile {
  name: string;
  mimeType: string;
  size: number;
  data: Blob;
}

/** Archivo de texto generado por la app (por ejemplo, el respaldo JSON). */
export interface ExportFile {
  name: string;
  content: string;
  mimeType: string;
  /** Título del menú de compartir (solo Android). */
  shareTitle?: string;
}

/** "canceled": el usuario cerró el menú de compartir sin elegir destino. */
export type SaveResult = 'saved' | 'canceled';

/** Archivo binario que la app le entrega al usuario (por ejemplo, un adjunto). */
export interface BinaryFile {
  name: string;
  mimeType: string;
  data: Blob;
}

export interface PickFilesOptions {
  multiple?: boolean;
  /** Tipos aceptados, como en <input accept>. Sin valor: cualquier archivo. */
  accept?: string;
}

/** Archivos: exportación (Fase 6), adjuntos (Fase 9). La cámara llega con Android. */
export interface FileService {
  /** Web: descarga el archivo. Android: lo guarda en la caché y abre el menú de compartir. */
  saveAndShare(file: ExportFile): Promise<SaveResult>;
  /** Selector de archivos del sistema. Devuelve [] si se cierra sin elegir. */
  pickFiles(options?: PickFilesOptions): Promise<PickedFile[]>;
  /** Web: descarga el archivo (nunca lo abre en la app). Android: menú de compartir. */
  saveFile(file: BinaryFile): Promise<SaveResult>;
  /** Web: abre un PDF en una pestaña nueva; si el navegador lo bloquea, lo descarga. */
  openPdf(file: BinaryFile): Promise<void>;
  takePhoto?(): Promise<PickedFile | null>;
}

export interface CompressImageOptions {
  outputType: string;
  quality: number;
  /** Lado mayor máximo, en píxeles. */
  maxSide: number;
}

export interface CompressedImage {
  data: Blob;
  width: number;
  height: number;
}

/** Compresión de fotos antes de subirlas. */
export interface ImageService {
  /** null si el navegador no puede leer la imagen (por ejemplo, HEIC). */
  compress(data: Blob, options: CompressImageOptions): Promise<CompressedImage | null>;
}

export interface StoredFileInfo {
  id: string;
  /** Cuándo se guardó (milisegundos desde 1970). */
  savedAt: number;
}

/** Archivos guardados en el dispositivo: adjuntos sin subir y los ya descargados. */
export interface LocalFileStore {
  put(id: string, data: Blob): Promise<void>;
  get(id: string): Promise<Blob | null>;
  remove(ids: readonly string[]): Promise<void>;
  list(): Promise<StoredFileInfo[]>;
  clear(): Promise<void>;
  /** Pide que el sistema no borre estos datos cuando falte espacio. */
  requestPersistence(): Promise<void>;
}
