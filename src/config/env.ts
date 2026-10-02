import { z } from 'zod';

// Valida las variables públicas del .env. Si falta algo, la app muestra
// una pantalla de configuración en lugar de fallar con errores confusos.

const httpsUrl = z.url({ protocol: /^https$/ });

const envSchema = z.object({
  supabaseUrl: httpsUrl,
  supabasePublishableKey: z
    .string()
    .trim()
    .min(1)
    .refine((value) => !value.startsWith('sb_secret_'), 'No puede ser una clave secreta'),
  powerSyncUrl: httpsUrl,
  captchaProvider: z.enum(['turnstile', 'hcaptcha']).optional(),
  captchaSiteKey: z.string().trim().optional(),
});

export type AppEnv = z.infer<typeof envSchema>;

export type EnvResult = { ok: true; env: AppEnv } | { ok: false; missing: string[] };

const VARIABLE_NAMES: Record<keyof AppEnv, string> = {
  supabaseUrl: 'VITE_SUPABASE_URL',
  supabasePublishableKey: 'VITE_SUPABASE_PUBLISHABLE_KEY',
  powerSyncUrl: 'VITE_POWERSYNC_URL',
  captchaProvider: 'VITE_CAPTCHA_PROVIDER',
  captchaSiteKey: 'VITE_CAPTCHA_SITE_KEY',
};

function emptyToUndefined(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function parseEnv(raw: ImportMetaEnv): EnvResult {
  const result = envSchema.safeParse({
    supabaseUrl: emptyToUndefined(raw.VITE_SUPABASE_URL),
    supabasePublishableKey: emptyToUndefined(raw.VITE_SUPABASE_PUBLISHABLE_KEY),
    powerSyncUrl: emptyToUndefined(raw.VITE_POWERSYNC_URL),
    captchaProvider: emptyToUndefined(raw.VITE_CAPTCHA_PROVIDER),
    captchaSiteKey: emptyToUndefined(raw.VITE_CAPTCHA_SITE_KEY),
  });
  if (result.success) {
    return { ok: true, env: result.data };
  }
  const missing = Array.from(
    new Set(
      result.error.issues.map((issue) => {
        const key = issue.path[0] as keyof AppEnv | undefined;
        return key ? VARIABLE_NAMES[key] : 'desconocida';
      }),
    ),
  );
  return { ok: false, missing };
}

export const envResult = parseEnv(import.meta.env);

// Acceso directo para el código que solo corre con la configuración válida.
export function requireEnv(): AppEnv {
  if (!envResult.ok) {
    throw new Error('Configuración incompleta');
  }
  return envResult.env;
}

// El captcha se activa solo si hay proveedor y site key.
export function captchaConfig(): { provider: 'turnstile' | 'hcaptcha'; siteKey: string } | null {
  if (!envResult.ok) return null;
  const { captchaProvider, captchaSiteKey } = envResult.env;
  if (!captchaProvider || !captchaSiteKey) return null;
  return { provider: captchaProvider, siteKey: captchaSiteKey };
}
