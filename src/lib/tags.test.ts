import { describe, expect, it } from 'vitest';
import { findTagByName, pickTagColor, sameTagName, sortTags } from './tags';

const tags = [
  { id: '1', name: 'urgente' },
  { id: '2', name: 'Árbol' },
  { id: '3', name: 'Facultad' },
  { id: '4', name: 'cliente 10' },
  { id: '5', name: 'cliente 2' },
];

describe('etiquetas', () => {
  it('compara nombres sin distinguir mayúsculas ni espacios de los bordes', () => {
    expect(sameTagName('Urgente', ' urgente ')).toBe(true);
    expect(sameTagName('ÑANDÚ', 'ñandú')).toBe(true);
    expect(sameTagName('Urgente', 'Urgentes')).toBe(false);
  });

  it('encuentra una etiqueta con el mismo nombre, salvo la indicada', () => {
    expect(findTagByName(tags, 'URGENTE')?.id).toBe('1');
    expect(findTagByName(tags, 'urgente', '1')).toBeUndefined();
    expect(findTagByName(tags, 'otra')).toBeUndefined();
  });

  it('ordena alfabéticamente en español', () => {
    expect(sortTags(tags).map((tag) => tag.name)).toEqual([
      'Árbol',
      'cliente 2',
      'cliente 10',
      'Facultad',
      'urgente',
    ]);
  });

  it('elige el color menos usado para una etiqueta nueva', () => {
    expect(pickTagColor([])).toBe('blue');
    expect(pickTagColor(['blue'])).toBe('green');
    expect(pickTagColor(['blue', 'green', null])).toBe('purple');
    expect(
      pickTagColor([
        'blue',
        'green',
        'purple',
        'orange',
        'teal',
        'pink',
        'amber',
        'indigo',
        'red',
        'slate',
        'blue',
      ]),
    ).toBe('green');
  });
});
