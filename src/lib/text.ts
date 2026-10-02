// Normaliza texto para buscar sin distinguir mayúsculas ni tildes.
export function normalizeForSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

export function matchesSearch(text: string, query: string): boolean {
  const normalizedQuery = normalizeForSearch(query);
  if (!normalizedQuery) return true;
  return normalizeForSearch(text).includes(normalizedQuery);
}
