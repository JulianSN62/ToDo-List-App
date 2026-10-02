// Construye la Content Security Policy que se inyecta en el index.html del build.
// Solo permite conectarse al propio origen y a los servicios configurados en el .env.

export interface CspInput {
  supabaseUrl?: string;
  powerSyncUrl?: string;
  captchaProvider?: string;
}

const CAPTCHA_ORIGINS: Record<string, string[]> = {
  turnstile: ['https://challenges.cloudflare.com'],
  hcaptcha: ['https://hcaptcha.com', 'https://*.hcaptcha.com'],
};

function originsFor(url: string | undefined): string[] {
  if (!url) return [];
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return [];
    return [parsed.origin, `wss://${parsed.host}`];
  } catch {
    return [];
  }
}

export function buildContentSecurityPolicy(input: CspInput): string {
  const captcha = CAPTCHA_ORIGINS[input.captchaProvider ?? ''] ?? [];
  const supabase = originsFor(input.supabaseUrl);
  const powerSync = originsFor(input.powerSyncUrl);
  const httpsSupabase = supabase.filter((origin) => origin.startsWith('https:'));

  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],
    'script-src': ["'self'", "'wasm-unsafe-eval'", ...captcha],
    'worker-src': ["'self'", 'blob:'],
    'connect-src': ["'self'", ...supabase, ...powerSync, ...captcha],
    'img-src': ["'self'", 'data:', 'blob:', ...httpsSupabase],
    'style-src': ["'self'", "'unsafe-inline'"],
    'font-src': ["'self'", 'data:'],
    'frame-src': captcha.length > 0 ? captcha : ["'none'"],
    'manifest-src': ["'self'"],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
  };

  return Object.entries(directives)
    .map(([name, values]) => `${name} ${Array.from(new Set(values)).join(' ')}`)
    .join('; ');
}
