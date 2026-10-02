import type { ColorToken } from './colors';

// Etiquetas globales: el nombre es único sin distinguir mayúsculas,
// igual que el índice único de la base (owner_id, lower(name)).

interface NamedItem {
  id: string;
  name: string;
}

export function tagNameKey(name: string): string {
  return name.trim().toLocaleLowerCase('es');
}

export function sameTagName(a: string, b: string): boolean {
  return tagNameKey(a) === tagNameKey(b);
}

// Busca una etiqueta con el mismo nombre (ignorando la que tenga el id "exceptId").
export function findTagByName<T extends NamedItem>(
  tags: readonly T[],
  name: string,
  exceptId?: string,
): T | undefined {
  const key = tagNameKey(name);
  return tags.find((tag) => tag.id !== exceptId && tagNameKey(tag.name) === key);
}

const collator = new Intl.Collator('es', { sensitivity: 'base', numeric: true });

// Orden alfabético en español (sin distinguir mayúsculas ni tildes).
export function sortTags<T extends NamedItem>(tags: readonly T[]): T[] {
  return [...tags].sort(
    (a, b) => collator.compare(a.name, b.name) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  );
}

// Orden en que se reparten los colores automáticos (el gris queda al final).
const AUTO_COLOR_ORDER: readonly ColorToken[] = [
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
];

// Color para una etiqueta creada al vuelo: el menos usado entre las existentes.
export function pickTagColor(usedColors: readonly (ColorToken | null)[]): ColorToken {
  const counts = new Map<ColorToken, number>(AUTO_COLOR_ORDER.map((token) => [token, 0]));
  for (const color of usedColors) {
    if (color) counts.set(color, (counts.get(color) ?? 0) + 1);
  }
  let best: ColorToken = 'blue';
  let bestCount = Number.POSITIVE_INFINITY;
  for (const token of AUTO_COLOR_ORDER) {
    const count = counts.get(token) ?? 0;
    if (count < bestCount) {
      best = token;
      bestCount = count;
    }
  }
  return best;
}
