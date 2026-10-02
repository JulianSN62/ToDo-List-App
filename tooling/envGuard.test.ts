import { describe, expect, it } from 'vitest';
import { buildContentSecurityPolicy } from './csp.ts';
import { findSecretsInPublicEnv } from './envGuard.ts';

function fakeJwt(payload: object): string {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'HS256' })}.${encode(payload)}.firma`;
}

describe('control de secretos en variables públicas', () => {
  it('acepta las variables públicas esperadas', () => {
    expect(
      findSecretsInPublicEnv({
        VITE_SUPABASE_URL: 'https://abc.supabase.co',
        VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_123',
        VITE_POWERSYNC_URL: 'https://x.powersync.journeyapps.com',
      }),
    ).toEqual([]);
  });

  it('detecta claves secretas y service_role', () => {
    expect(findSecretsInPublicEnv({ VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_secret_abc' })).toHaveLength(
      1,
    );
    expect(findSecretsInPublicEnv({ VITE_KEY: fakeJwt({ role: 'service_role' }) })).toHaveLength(1);
    expect(findSecretsInPublicEnv({ VITE_DB_PASSWORD: 'x' })).toHaveLength(1);
  });

  it('ignora variables que no son públicas', () => {
    expect(findSecretsInPublicEnv({ SECRET_KEY: 'sb_secret_abc' })).toEqual([]);
  });
});

describe('content security policy', () => {
  it('permite solo el propio origen y los servicios configurados', () => {
    const policy = buildContentSecurityPolicy({
      supabaseUrl: 'https://abc.supabase.co',
      powerSyncUrl: 'https://x.powersync.journeyapps.com',
    });
    expect(policy).toContain("default-src 'self'");
    expect(policy).toContain('https://abc.supabase.co');
    expect(policy).toContain('wss://abc.supabase.co');
    expect(policy).toContain('https://x.powersync.journeyapps.com');
    expect(policy).toContain("frame-src 'none'");
    expect(policy).toContain("object-src 'none'");
  });

  it('ignora URLs que no son https', () => {
    const policy = buildContentSecurityPolicy({ supabaseUrl: 'http://inseguro.com' });
    expect(policy).not.toContain('inseguro.com');
  });

  it('agrega el proveedor de captcha solo si está activo', () => {
    const policy = buildContentSecurityPolicy({ captchaProvider: 'turnstile' });
    expect(policy).toContain('https://challenges.cloudflare.com');
  });
});
