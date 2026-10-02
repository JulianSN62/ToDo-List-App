/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/react" />

// Versión de la app, inyectada desde package.json en vite.config.ts
declare const __APP_VERSION__: string;

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  readonly VITE_POWERSYNC_URL?: string;
  readonly VITE_CAPTCHA_PROVIDER?: string;
  readonly VITE_CAPTCHA_SITE_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
