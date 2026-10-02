import { defineConfig } from '@playwright/test';

// Tests de punta a punta (spec 15.1) sobre el build de producción servido con vite preview.
// Usan el Microsoft Edge instalado en la PC (no se descargan navegadores), una sesión
// ficticia y ninguna conexión externa: todo pasa contra la base local del navegador.

const PORT = 4174;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: 'e2e',
  tsconfig: './tsconfig.e2e.json',
  outputDir: 'test-results',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  workers: 4,
  retries: 0,
  forbidOnly: true,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: BASE_URL,
    channel: 'msedge',
    // Sin timezoneId: el navegador usa la zona de la PC, igual que los helpers de fechas.
    locale: 'es-AR',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: {
      // Ningún host externo resuelve. Cubre también los workers de la base local,
      // cuyas peticiones no pasan por context.route.
      args: ['--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE localhost'],
    },
  },
  projects: [
    {
      name: 'mobile',
      testIgnore: /desktop\.spec\.ts/,
      use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
    },
    {
      name: 'desktop',
      testIgnore: /mobile\.spec\.ts/,
      use: { viewport: { width: 1280, height: 800 } },
    },
  ],
  webServer: {
    command: `npm run build:e2e && npx vite preview --mode e2e --outDir dist-e2e --port ${PORT} --strictPort`,
    url: BASE_URL,
    timeout: 180_000,
    reuseExistingServer: false,
    stdout: 'ignore',
    stderr: 'pipe',
    // Valores públicos ficticios: el dominio .invalid nunca resuelve.
    env: {
      VITE_SUPABASE_URL: 'https://e2e.supabase.invalid',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_e2e',
      VITE_POWERSYNC_URL: 'https://e2e.powersync.invalid',
      VITE_CAPTCHA_PROVIDER: '',
      VITE_CAPTCHA_SITE_KEY: '',
    },
  },
});
