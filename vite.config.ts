import { readFileSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { compatTexts } from './src/i18n/compat.ts';
import { browserSupport } from './tooling/browserSupport.ts';
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

// Librerías que se usan desde el arranque, en archivos aparte: una versión nueva que solo
// cambia código de la app no obliga a volver a bajarlas. Solo paquetes que se cargan al
// inicio: un patrón más amplio metería acá módulos que hoy se cargan a demanda (por
// ejemplo, los websockets de PowerSync, en @powersync/shared-internals).
const VENDOR_CHUNKS = [
  {
    name: 'vendor-react',
    test: /node_modules[\\/](react|react-dom|scheduler|react-router)[\\/]/,
  },
  {
    name: 'vendor-data',
    test: /node_modules[\\/](@powersync[\\/](web|common|react|capacitor)|@supabase[\\/][^\\/]+|@capacitor-community[\\/]sqlite)[\\/]/,
  },
  {
    name: 'vendor-ui',
    test: /node_modules[\\/](radix-ui|@radix-ui[\\/][^\\/]+|vaul|sonner|lucide-react|@dnd-kit[\\/][^\\/]+)[\\/]/,
  },
];

export default defineConfig(({ mode }) => {
  // En el modo e2e no se lee ningún .env: las variables (ficticias) llegan desde
  // playwright.config.ts, así los tests nunca usan ni tocan el proyecto real.
  const envDir = mode === 'e2e' ? false : process.cwd();
  const env = loadEnv(mode, envDir, 'VITE_');
  assertNoSecretsInPublicEnv(env);

  return {
    envDir,
    plugins: [
      react(),
      tailwindcss(),
      contentSecurityPolicy(env),
      browserSupport(compatTexts),
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
          // Partes de SQLite que la app nunca carga: las variantes "mc-" son para cifrar la base
          // local, y la versión sincrónica y los VFS de OPFS o en memoria solo se usan con otra
          // configuración. PowerSync web usa IDBBatchAtomicVFS (versión async) por defecto.
          globIgnores: [
            '**/mc-wa-sqlite*',
            '**/wa-sqlite-????????.{js,wasm}',
            '**/OPFS*VFS-*.js',
            '**/AccessHandlePoolVFS-*.js',
            '**/MemoryVFS-*.js',
          ],
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
      rolldownOptions: {
        output: {
          codeSplitting: { groups: VENDOR_CHUNKS },
        },
      },
      // El mayor es vendor-data (base local + sincronización + Supabase, ~600 KB).
      chunkSizeWarningLimit: 700,
    },
    server: {
      port: 5173,
    },
  };
});
