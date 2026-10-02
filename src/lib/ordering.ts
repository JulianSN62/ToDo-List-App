import { generateKeyBetween } from 'fractional-indexing';

// Orden manual con claves de texto (fractional-indexing): mover o insertar
// un elemento modifica solo ese registro.

export interface Positioned {
  id: string;
  position: string;
}

// Comparador estable: primero la clave, después el id (desempata claves repetidas).
export function comparePositioned(a: Positioned, b: Positioned): number {
  if (a.position < b.position) return -1;
  if (a.position > b.position) return 1;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

export function sortByPosition<T extends Positioned>(items: readonly T[]): T[] {
  return [...items].sort(comparePositioned);
}

// Clave entre dos vecinos. Tolera claves repetidas o invertidas (pueden aparecer
// si dos dispositivos crean elementos sin conexión al mismo tiempo).
export function keyBetween(lower: string | null, upper: string | null): string {
  if (lower !== null && upper !== null && lower >= upper) {
    // No hay espacio estricto entre ambas: se ubica inmediatamente después de "lower".
    return `${lower}V`;
  }
  return generateKeyBetween(lower, upper);
}

// Clave para agregar al final de una lista ordenada.
export function keyAtEnd(sorted: readonly Positioned[]): string {
  const last = sorted[sorted.length - 1];
  return keyBetween(last ? last.position : null, null);
}

// Clave para agregar al principio de una lista ordenada.
export function keyAtStart(sorted: readonly Positioned[]): string {
  const first = sorted[0];
  return keyBetween(null, first ? first.position : null);
}

// Nueva clave para que el elemento "movingId" quede en "toIndex"
// (índice calculado sobre la lista SIN ese elemento).
export function keyForIndex(
  sorted: readonly Positioned[],
  movingId: string,
  toIndex: number,
): string {
  const others = sorted.filter((item) => item.id !== movingId);
  const index = Math.max(0, Math.min(toIndex, others.length));
  const lower = index > 0 ? (others[index - 1]?.position ?? null) : null;
  const upper = index < others.length ? (others[index]?.position ?? null) : null;
  return keyBetween(lower, upper);
}

export type MoveDirection = 'up' | 'down';

// Nueva clave para subir o bajar un lugar. Devuelve null si ya está en el extremo.
export function keyForStep(
  sorted: readonly Positioned[],
  movingId: string,
  direction: MoveDirection,
): string | null {
  const index = sorted.findIndex((item) => item.id === movingId);
  if (index === -1) return null;
  if (direction === 'up' && index === 0) return null;
  if (direction === 'down' && index === sorted.length - 1) return null;
  const target = direction === 'up' ? index - 1 : index + 1;
  return keyForIndex(sorted, movingId, target);
}

// Nueva clave al arrastrar "activeId" hasta la posición de "overId".
export function keyForDrop(
  sorted: readonly Positioned[],
  activeId: string,
  overId: string,
): string | null {
  const from = sorted.findIndex((item) => item.id === activeId);
  const to = sorted.findIndex((item) => item.id === overId);
  if (from === -1 || to === -1 || from === to) return null;
  return keyForIndex(sorted, activeId, to);
}
