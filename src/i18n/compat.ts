// Aviso para navegadores o WebView viejos (tooling/browserSupport.ts). Va aparte de es.ts
// porque lo lee también vite.config.ts, que corre en Node sin el alias "@/"; es.ts lo
// incluye como es.compat.
export const compatTexts = {
  title: 'Hay que actualizar el navegador',
  android:
    'Para usar ToDo List, actualizá "Android System WebView" desde Play Store y volvé a abrir la app.',
  web: 'Para usar ToDo List, actualizá el navegador a su última versión.',
};
