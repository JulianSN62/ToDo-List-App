import { describe, expect, it } from 'vitest';
import { colorTint, colorVar, toColorToken } from './colors';

describe('colores', () => {
  it('solo acepta tokens de la paleta', () => {
    expect(toColorToken('indigo')).toBe('indigo');
    expect(toColorToken('#ff0000')).toBeNull();
    expect(toColorToken(null)).toBeNull();
  });

  it('usa variables CSS y nunca hex', () => {
    expect(colorVar('red')).toBe('var(--token-red)');
    expect(colorTint('red')).toBe('color-mix(in srgb, var(--token-red) 12%, transparent)');
  });
});
