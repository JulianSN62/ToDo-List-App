// @vitest-environment node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// Las reglas de Netlify viven en public/ (Vite las copia a dist/) para que se apliquen
// con cualquier forma de publicar, incluso arrastrando dist (ahí netlify.toml no viaja).

const read = (path: string) =>
  readFileSync(fileURLToPath(new URL(`../${path}`, import.meta.url)), 'utf8');

const rules = (text: string) =>
  text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '' && !line.startsWith('#'));

describe('configuración de Netlify', () => {
  it('la SPA sirve index.html en cualquier ruta', () => {
    expect(rules(read('public/_redirects'))).toEqual(['/*    /index.html    200']);
  });

  it('las cabeceras de seguridad están en public/_headers', () => {
    const headers = read('public/_headers');
    for (const name of [
      'X-Frame-Options: DENY',
      'X-Content-Type-Options: nosniff',
      'Referrer-Policy:',
      'Strict-Transport-Security:',
      'Permissions-Policy:',
      'Cross-Origin-Opener-Policy: same-origin',
    ]) {
      expect(headers).toContain(name);
    }
  });

  it('netlify.toml no repite redirecciones ni cabeceras', () => {
    const toml = rules(read('netlify.toml')).join('\n');
    expect(toml).not.toMatch(/\[\[(redirects|headers)\]\]/);
  });
});
