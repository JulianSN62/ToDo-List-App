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
  KeyValueStorage,
  NotificationService,
  PlatformInfo,
} from './types';
import { webFiles } from './web/files';
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

export type * from './types';
