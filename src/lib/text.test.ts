import { describe, expect, it } from 'vitest';
import { matchesSearch, normalizeForSearch } from './text';

describe('normalización de búsqueda', () => {
  it('ignora mayúsculas y tildes', () => {
    expect(normalizeForSearch('  Canción ÁRBOL  ')).toBe('cancion arbol');
    expect(matchesSearch('Programación', 'PROGRAMACION')).toBe(true);
    expect(matchesSearch('Ñandú', 'nandu')).toBe(true);
  });

  it('una búsqueda vacía coincide con todo', () => {
    expect(matchesSearch('lo que sea', '   ')).toBe(true);
  });

  it('no coincide si el texto no contiene la búsqueda', () => {
    expect(matchesSearch('Universidad', 'cliente')).toBe(false);
  });
});
