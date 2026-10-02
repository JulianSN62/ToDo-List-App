import { useEffect, useRef } from 'react';
import { es } from '@/i18n/es';

// Captcha opcional del login (Cloudflare Turnstile o hCaptcha).
// Solo se monta si VITE_CAPTCHA_SITE_KEY tiene valor; si no, el login funciona sin captcha.

type Provider = 'turnstile' | 'hcaptcha';

interface CaptchaApi {
  render: (container: HTMLElement, options: Record<string, unknown>) => string;
  reset: (widgetId?: string) => void;
  remove?: (widgetId: string) => void;
}

declare global {
  interface Window {
    turnstile?: CaptchaApi;
    hcaptcha?: CaptchaApi;
  }
}

const SCRIPTS: Record<Provider, string> = {
  turnstile: 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit',
  hcaptcha: 'https://js.hcaptcha.com/1/api.js?render=explicit',
};

const loading = new Map<Provider, Promise<void>>();

function loadScript(provider: Provider): Promise<void> {
  const existing = loading.get(provider);
  if (existing) return existing;
  const promise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPTS[provider];
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      loading.delete(provider);
      reject(new Error('No se pudo cargar el captcha'));
    };
    document.head.appendChild(script);
  });
  loading.set(provider, promise);
  return promise;
}

export function CaptchaWidget({
  provider,
  siteKey,
  onToken,
  resetSignal,
}: {
  provider: Provider;
  siteKey: string;
  onToken: (token: string | null) => void;
  /** Cambiar este valor reinicia el captcha (cada token sirve una sola vez). */
  resetSignal: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onTokenRef = useRef(onToken);

  useEffect(() => {
    onTokenRef.current = onToken;
  });

  useEffect(() => {
    let cancelled = false;
    void loadScript(provider)
      .then(() => {
        const api = provider === 'turnstile' ? window.turnstile : window.hcaptcha;
        if (cancelled || !api || !containerRef.current) return;
        widgetIdRef.current = api.render(containerRef.current, {
          sitekey: siteKey,
          callback: (token: string) => onTokenRef.current(token),
          'expired-callback': () => onTokenRef.current(null),
          'error-callback': () => onTokenRef.current(null),
        });
      })
      .catch(() => onTokenRef.current(null));
    return () => {
      cancelled = true;
      const api = provider === 'turnstile' ? window.turnstile : window.hcaptcha;
      if (widgetIdRef.current && api?.remove) api.remove(widgetIdRef.current);
      widgetIdRef.current = null;
    };
  }, [provider, siteKey]);

  useEffect(() => {
    if (resetSignal === 0) return;
    const api = provider === 'turnstile' ? window.turnstile : window.hcaptcha;
    if (widgetIdRef.current) api?.reset(widgetIdRef.current);
    onTokenRef.current(null);
  }, [resetSignal, provider]);

  return (
    <div
      ref={containerRef}
      aria-label={es.auth.captchaLabel}
      className="flex min-h-16 justify-center"
    />
  );
}
