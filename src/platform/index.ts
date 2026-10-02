import { Capacitor } from '@capacitor/core';
import { capacitorFiles } from './capacitor/files';
import { capacitorLifecycle } from './capacitor/lifecycle';
import { capacitorLinks } from './capacitor/links';
import { capacitorNotifications } from './capacitor/notifications';
import { capacitorStorage } from './capacitor/storage';
import type {
  AppLifecycle,
  ExternalLinkService,
  FileService,
  ImageService,
  KeyValueStorage,
  LocalFileStore,
  NotificationService,
  PlatformInfo,
} from './types';
import { webFileStore } from './web/fileStore';
import { webFiles } from './web/files';
import { webImages } from './web/images';
import { webLifecycle } from './web/lifecycle';
import { webLinks } from './web/links';
import { webNotifications } from './web/notifications';
import { webStorage } from './web/storage';

// Único lugar donde se decide qué implementación usar según la plataforma.

const isNative = Capacitor.isNativePlatform();

export const platform: PlatformInfo = {
  isNative,
  isAndroid: Capacitor.getPlatform() === 'android',
};

export const storage: KeyValueStorage = isNative ? capacitorStorage : webStorage;
export const lifecycle: AppLifecycle = isNative ? capacitorLifecycle : webLifecycle;
export const externalLinks: ExternalLinkService = isNative ? capacitorLinks : webLinks;
export const notifications: NotificationService = isNative
  ? capacitorNotifications
  : webNotifications;

export const files: FileService = isNative ? capacitorFiles : webFiles;

// Android usa por ahora lo mismo que la web (el WebView tiene IndexedDB y canvas).
// Si hiciera falta, se pueden pasar a @capacitor/filesystem sin tocar la app.
export const images: ImageService = webImages;
export const localFiles: LocalFileStore = webFileStore;

export type * from './types';
