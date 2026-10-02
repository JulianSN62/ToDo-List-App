import { readFileSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { buildContentSecurityPolicy } from './tooling/csp.ts';
import { assertNoSecretsInPublicEnv } from './tooling/envGuard.ts';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as {
  version: string;
};

// Inyecta la CSP como meta tag solo en el build (en desarrollo rompería el HMR de Vite).
function contentSecurityPolicy(env: Record<string, string>): Plugin {
  return {
    name: 'app-content-security-policy',
    apply: 'build',
    transformIndexHtml(html) {
      const policy = buildContentSecurityPolicy({
        supabaseUrl: env.VITE_SUPABASE_URL,
        powerSyncUrl: env.VITE_POWERSYNC_URL,
        captchaProvider: env.VITE_CAPTCHA_SITE_KEY ? env.VITE_CAPTCHA_PROVIDER : undefined,
      });
      return html.replace(
        '<meta charset="UTF-8" />',
        `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${policy}" />`,
      );
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  assertNoSecretsInPublicEnv(env);

  return {
    plugins: [
      react(),
      tailwindcss(),
      contentSecurityPolicy(env),
      VitePWA({
        // El registro del service worker se hace a mano (src/app/pwa) y nunca en Android.
        injectRegister: false,
        registerType: 'prompt',
        includeAssets: ['favicon.svg', 'apple-touch-icon-180x180.png'],
        manifest: {
          id: '/',
          name: 'ToDo List',
          short_name: 'ToDo List',
          description: 'Lista de tareas personal con carpetas, offline y sincronizada.',
          lang: 'es-AR',
          start_url: '/',
          scope: '/',
          display: 'standalone',
          orientation: 'any',
          background_color: '#F8FAFC',
          theme_color: '#F8FAFC',
          icons: [
            { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
            { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
            {
              src: 'maskable-icon-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          // Precachea el shell completo, incluidos los workers y el WASM de la base local.
          globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2,wasm}'],
          // Las variantes "mc-" de SQLite solo se usan con cifrado de la base local, que la app no usa.
          globIgnores: ['**/mc-wa-sqlite*'],
          maximumFileSizeToCacheInBytes: 15 * 1024 * 1024,
          navigateFallback: '/index.html',
          cleanupOutdatedCaches: true,
        },
      }),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version),
    },
    optimizeDeps: {
      // PowerSync incluye web workers y WASM que no deben pasar por el pre-bundling.
      exclude: ['@powersync/web'],
    },
    worker: {
      format: 'es',
    },
    build: {
      // El bundle principal incluye la base local y el cliente de sincronización (~1,2 MB).
      // Se carga una sola vez y queda en caché; dividirlo es una optimización pendiente (Fase 10).
      chunkSizeWarningLimit: 1500,
    },
    server: {
      port: 5173,
    },
  };
});
