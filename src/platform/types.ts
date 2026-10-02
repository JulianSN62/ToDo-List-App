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

/** Archivos: exportación (Fase 6); selector y cámara llegan en la Fase 9. */
export interface FileService {
  /** Web: descarga el archivo. Android: lo guarda en la caché y abre el menú de compartir. */
  saveAndShare(file: ExportFile): Promise<SaveResult>;
  pickFiles?(): Promise<PickedFile[]>;
  takePhoto?(): Promise<PickedFile | null>;
}
