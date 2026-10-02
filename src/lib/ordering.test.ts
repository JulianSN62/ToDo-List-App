import { describe, expect, it } from 'vitest';
import {
  keyAtEnd,
  keyAtStart,
  keyBetween,
  keyForDrop,
  keyForIndex,
  keyForStep,
  sortByPosition,
  type Positioned,
} from './ordering';

function list(...positions: string[]): Positioned[] {
  return positions.map((position, index) => ({ id: `id${index}`, position }));
}

function applyKey(items: Positioned[], id: string, position: string): string[] {
  return sortByPosition(items.map((item) => (item.id === id ? { ...item, position } : item))).map(
    (item) => item.id,
  );
}

describe('claves de orden', () => {
  it('genera claves al principio, al final y entre dos', () => {
    const items = list('a1', 'a2');
    expect(keyAtStart(items) < 'a1').toBe(true);
    expect(keyAtEnd(items) > 'a2').toBe(true);
    const middle = keyBetween('a1', 'a2');
    expect(middle > 'a1' && middle < 'a2').toBe(true);
    expect(keyAtEnd([])).toBe(keyBetween(null, null));
  });

  it('tolera claves repetidas generadas offline', () => {
    const key = keyBetween('a1', 'a1');
    expect(key > 'a1').toBe(true);
    expect(() => keyBetween('a2', 'a1')).not.toThrow();
  });

  it('ordena por posición y desempata por id', () => {
    const items: Positioned[] = [
      { id: 'b', position: 'a1' },
      { id: 'a', position: 'a1' },
      { id: 'c', position: 'a0' },
    ];
    expect(sortByPosition(items).map((item) => item.id)).toEqual(['c', 'a', 'b']);
  });
});

describe('mover elementos', () => {
  const items = list('a0', 'a1', 'a2', 'a3');

  it('ubica un elemento en un índice dado modificando solo su clave', () => {
    const key = keyForIndex(items, 'id3', 0);
    expect(applyKey(items, 'id3', key)).toEqual(['id3', 'id0', 'id1', 'id2']);
  });

  it('sube y baja un lugar', () => {
    const up = keyForStep(items, 'id2', 'up');
    expect(up).not.toBeNull();
    expect(applyKey(items, 'id2', up as string)).toEqual(['id0', 'id2', 'id1', 'id3']);

    const down = keyForStep(items, 'id0', 'down');
    expect(applyKey(items, 'id0', down as string)).toEqual(['id1', 'id0', 'id2', 'id3']);
  });

  it('no mueve más allá de los extremos', () => {
    expect(keyForStep(items, 'id0', 'up')).toBeNull();
    expect(keyForStep(items, 'id3', 'down')).toBeNull();
  });

  it('arrastra hacia abajo y hacia arriba como arrayMove', () => {
    const down = keyForDrop(items, 'id0', 'id2');
    expect(applyKey(items, 'id0', down as string)).toEqual(['id1', 'id2', 'id0', 'id3']);

    const up = keyForDrop(items, 'id3', 'id1');
    expect(applyKey(items, 'id3', up as string)).toEqual(['id0', 'id3', 'id1', 'id2']);

    expect(keyForDrop(items, 'id1', 'id1')).toBeNull();
  });
});
