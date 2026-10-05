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

export type NotificationPermission = 'granted' | 'denied' | 'prompt';

export interface NotificationChannelConfig {
  id: string;
  name: string;
  description: string;
  /** 4 = alta (suena y aparece arriba); 3 = normal; 2 = baja (sin sonido). */
  importance: 2 | 3 | 4;
  vibration: boolean;
}

/** Notificación con fecha para programar (aviso de vencimiento o recordatorio). */
export interface LocalNotificationRequest {
  /** Número que identifica la notificación en el sistema. */
  id: number;
  title: string;
  body: string;
  channelId: string;
  at: Date;
  /** Tarea que se abre al tocarla. */
  taskId: string;
}

/** Notificación fija de una tarea anclada (canal "pinned"). */
export interface PinnedNotificationRequest {
  id: number;
  title: string;
  body: string;
  taskId: string;
}

export interface ActiveNotificationIds {
  /** Programadas con fecha que todavía no salieron. */
  scheduledIds: number[];
  /** Visibles en la barra de notificaciones. */
  visibleIds: number[];
}

export interface NotificationDiagnostics {
  permission: NotificationPermission;
  /** Alarmas exactas (Android 12 o más): sin ellas los avisos pueden llegar tarde. */
  exactAlarms: 'granted' | 'denied' | 'unknown';
  /** "optimized": Android puede demorar o cortar los avisos para ahorrar batería. */
  battery: 'unrestricted' | 'optimized' | 'unknown';
}

export type NotificationSettingsTarget = 'notifications' | 'exactAlarms' | 'battery';

/**
 * Notificaciones locales (spec 9). Solo Android: en web no hace nada (isSupported = false).
 * La plataforma solo programa y cancela; qué programar lo decide src/lib/notificationPlan.ts.
 */
export interface NotificationService {
  isSupported(): boolean;
  /** Crea los canales (spec 9.3). Si ya existen, Android conserva lo que el usuario cambió. */
  ensureChannels(channels: readonly NotificationChannelConfig[]): Promise<void>;
  getPermission(): Promise<NotificationPermission>;
  requestPermission(): Promise<NotificationPermission>;
  getActive(): Promise<ActiveNotificationIds>;
  /** Programa o reemplaza (mismo id) sin abrir ninguna pantalla de permisos. */
  schedule(items: readonly LocalNotificationRequest[]): Promise<void>;
  /** Cancela las programadas (las ya visibles quedan en la barra). */
  cancel(ids: readonly number[]): Promise<void>;
  /**
   * Ancladas: recibe la lista completa, muestra (o actualiza) esas y quita las demás. Se
   * guardan en el dispositivo para volver a mostrarlas al reiniciar o si se descartan.
   */
  syncPinned(items: readonly PinnedNotificationRequest[]): Promise<void>;
  /** Cancela y quita todas, también las ancladas (al cerrar sesión). */
  cancelAll(): Promise<void>;
  /** Al tocar una notificación: recibe la tarea que hay que abrir. */
  onTap(callback: (taskId: string) => void): Unsubscribe;
  /** Se disparó una notificación con la app abierta. */
  onReceived(callback: () => void): Unsubscribe;
  sendTest(content: { id: number; title: string; body: string; channelId: string }): Promise<void>;
  getDiagnostics(): Promise<NotificationDiagnostics>;
  /** Abre la pantalla de Android para cambiar ese permiso. */
  openSettings(target: NotificationSettingsTarget): Promise<void>;
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

/** Archivos: exportación (Fase 6), adjuntos (Fase 9) y cámara (Bloque 8). */
export interface FileService {
  /** Web: descarga el archivo. Android: lo guarda en la caché y abre el menú de compartir. */
  saveAndShare(file: ExportFile): Promise<SaveResult>;
  /** Selector de archivos del sistema. Devuelve [] si se cierra sin elegir. */
  pickFiles(options?: PickFilesOptions): Promise<PickedFile[]>;
  /** Web: descarga el archivo (nunca lo abre en la app). Android: menú de compartir. */
  saveFile(file: BinaryFile): Promise<SaveResult>;
  /** Web: abre un PDF en una pestaña nueva; si el navegador lo bloquea, lo descarga. */
  openPdf(file: BinaryFile): Promise<void>;
  /**
   * Abre la cámara del teléfono para sacar una foto. Devuelve null si se cierra sin sacarla.
   * En una PC el navegador abre el selector de archivos (la app no ofrece el botón ahí).
   */
  takePhoto(): Promise<PickedFile | null>;
  /**
   * Borra las copias temporales que se compartieron (respaldo y adjuntos) y las fotos de la
   * cámara. Android las deja en carpetas de la app; se borran al cerrar sesión. En la web no
   * hay nada que borrar.
   */
  clearShared(): Promise<void>;
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
