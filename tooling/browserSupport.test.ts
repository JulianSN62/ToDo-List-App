import { describe, expect, it } from 'vitest';
import { compatTexts } from '../src/i18n/compat.ts';
import { buildCompatScript } from './browserSupport.ts';

describe('aviso para navegadores viejos', () => {
  const script = buildCompatScript(compatTexts);

  it('incluye los textos y revisa lo que la app necesita', () => {
    expect(script).toContain(JSON.stringify(compatTexts));
    expect(script).toContain("typeof structuredClone === 'function'");
    expect(script).toContain('color-mix(in srgb, red, blue)');
  });

  it('no usa sintaxis moderna (corre en navegadores viejos)', () => {
    expect(script).not.toMatch(/=>|\bconst\b|\blet\b|`|\?\.|\?\?/);
  });
});
