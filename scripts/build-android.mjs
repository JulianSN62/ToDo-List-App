// Compila el APK de prueba (debug) de Android.
// Uso: npm run android:build  (antes hace el build web y "cap sync").
// Gradle 8.14 (el que usa Capacitor 8) necesita un JDK entre 17 y 24: se busca un JDK 21.
// Para forzar uno en particular: variable de entorno ANDROID_JAVA_HOME.

import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const androidDir = join(root, 'android');
const isWindows = process.platform === 'win32';

// Busca carpetas de JDK 21 en las ubicaciones habituales.
function findJdk21() {
  const parents = isWindows
    ? [
        'C:\\Program Files\\Java',
        'C:\\Program Files\\Eclipse Adoptium',
        'C:\\Program Files\\Microsoft',
        join(homedir(), '.jdks'),
      ]
    : ['/usr/lib/jvm', '/Library/Java/JavaVirtualMachines', join(homedir(), '.jdks')];
  for (const parent of parents) {
    if (!existsSync(parent)) continue;
    const match = readdirSync(parent).find((name) =>
      /^(jdk|jbr|temurin|openjdk|corretto|zulu)?-?21([.-]|$)/i.test(name),
    );
    if (match) {
      const home = join(parent, match);
      const macHome = join(home, 'Contents', 'Home');
      return existsSync(macHome) ? macHome : home;
    }
  }
  return undefined;
}

const javaHome = process.env.ANDROID_JAVA_HOME ?? findJdk21() ?? process.env.JAVA_HOME;
console.log(`Usando JDK: ${javaHome ?? '(el del sistema)'}`);

const sdkCandidates = [
  process.env.ANDROID_HOME,
  process.env.ANDROID_SDK_ROOT,
  isWindows
    ? join(process.env.LOCALAPPDATA ?? '', 'Android', 'Sdk')
    : join(homedir(), 'Android', 'Sdk'),
  join(homedir(), 'Library', 'Android', 'sdk'),
];
const sdkDir = sdkCandidates.find((path) => path && existsSync(path));

if (!existsSync(androidDir)) {
  console.error('No existe la carpeta android/. Correr primero: npx cap add android');
  process.exit(1);
}

// local.properties le indica a Gradle dónde está el SDK (no se sube al repositorio).
const localProperties = join(androidDir, 'local.properties');
if (!existsSync(localProperties) && sdkDir) {
  writeFileSync(localProperties, `sdk.dir=${sdkDir.replaceAll('\\', '\\\\')}\n`);
}

const gradlew = join(androidDir, isWindows ? 'gradlew.bat' : 'gradlew');
const result = spawnSync(
  isWindows ? `"${gradlew}" assembleDebug` : gradlew,
  isWindows ? [] : ['assembleDebug'],
  {
    cwd: androidDir,
    stdio: 'inherit',
    shell: isWindows,
    env: { ...process.env, ...(javaHome ? { JAVA_HOME: javaHome } : {}) },
  },
);

if (result.status === 0) {
  console.log('\nAPK listo: android/app/build/outputs/apk/debug/app-debug.apk');
}
process.exit(result.status ?? 1);
