import type { CapacitorConfig } from '@capacitor/cli';

// Configuración de la app Android. El appId es el nombre del paquete:
// cambiarlo después hace que Android la trate como una app distinta.
const config: CapacitorConfig = {
  appId: 'com.todolistapp.app',
  appName: 'ToDo List',
  webDir: 'dist',
  server: {
    // Los archivos se sirven desde https://localhost dentro de la app (sin servidor externo).
    androidScheme: 'https',
  },
  android: {
    // Nunca cargar contenido http dentro de una página https.
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      // Se oculta desde el código apenas la app está lista (src/main.tsx).
      launchAutoHide: false,
      backgroundColor: '#F8FAFC',
      showSpinner: false,
    },
    SystemBars: {
      // Pantalla de borde a borde: las áreas seguras llegan a CSS como env(safe-area-inset-*).
      insetsHandling: 'css',
      style: 'DEFAULT',
    },
    Keyboard: {
      // El WebView se achica cuando aparece el teclado, para que no tape los campos.
      resizeOnFullScreen: true,
    },
  },
};

export default config;
