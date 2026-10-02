import { describe, expect, it } from 'vitest';
import { linkDisplayText, normalizeLinkLabel, normalizeLinkUrl } from './links';
import { LIMITS } from './validation';

describe('links', () => {
  it('acepta direcciones http y https', () => {
    expect(normalizeLinkUrl('https://example.com/docs?id=1')).toBe('https://example.com/docs?id=1');
    expect(normalizeLinkUrl('  HTTP://Example.com  ')).toBe('http://example.com/');
  });

  it('antepone https:// a un dominio sin protocolo', () => {
    expect(normalizeLinkUrl('example.com')).toBe('https://example.com/');
    expect(normalizeLinkUrl('www.github.com/usuario/repo')).toBe(
      'https://www.github.com/usuario/repo',
    );
    expect(normalizeLinkUrl('localhost:5173/f/1')).toBe('https://localhost:5173/f/1');
    expect(normalizeLinkUrl('example.com:8080')).toBe('https://example.com:8080/');
  });

  it('rechaza otros protocolos y textos que no son direcciones', () => {
    expect(normalizeLinkUrl('javascript:alert(1)')).toBeNull();
    expect(normalizeLinkUrl('JavaScript:alert(1)')).toBeNull();
    expect(normalizeLinkUrl('mailto:vos@email.com')).toBeNull();
    expect(normalizeLinkUrl('ftp://example.com')).toBeNull();
    expect(normalizeLinkUrl('data:text/html,hola')).toBeNull();
    expect(normalizeLinkUrl('hola')).toBeNull();
    expect(normalizeLinkUrl('dos palabras.com')).toBeNull();
    expect(normalizeLinkUrl('   ')).toBeNull();
  });

  it('rechaza direcciones demasiado largas', () => {
    const path = 'a'.repeat(LIMITS.linkUrl);
    expect(normalizeLinkUrl(`https://example.com/${path}`)).toBeNull();
  });

  it('el texto del link es opcional', () => {
    expect(normalizeLinkLabel('   ')).toBeNull();
    expect(normalizeLinkLabel(' Contrato ')).toBe('Contrato');
    expect(normalizeLinkLabel('x'.repeat(LIMITS.linkLabel + 10))).toHaveLength(LIMITS.linkLabel);
  });

  it('muestra el texto o, si no hay, el dominio y la ruta', () => {
    expect(linkDisplayText({ url: 'https://example.com/', label: 'Contrato' })).toBe('Contrato');
    expect(linkDisplayText({ url: 'https://www.example.com/', label: null })).toBe('example.com');
    expect(linkDisplayText({ url: 'https://example.com/docs/?a=1', label: null })).toBe(
      'example.com/docs/?a=1',
    );
  });
});
