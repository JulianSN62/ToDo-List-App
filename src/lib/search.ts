import { normalizeForSearch } from './text';

// Búsqueda global en memoria sobre la base local: título, descripción y nombre de etiquetas,
// sin distinguir mayúsculas ni tildes. Cada palabra buscada tiene que aparecer en algún lado.

export interface SearchableTask {
  id: string;
  title: string;
  description: string | null;
  isDone: boolean;
  isPriority: boolean;
}

export interface SearchableTag {
  id: string;
  name: string;
}

export interface SearchEntry<T extends SearchableTask, G extends SearchableTag> {
  task: T;
  title: string;
  description: string;
  tags: { tag: G; name: string }[];
}

export interface SearchResult<T extends SearchableTask, G extends SearchableTag> {
  task: T;
  /** Etiquetas que coinciden con la búsqueda o con el filtro elegido. */
  matchedTags: G[];
}

// Se arma una vez por cambio de datos (no en cada tecla).
export function buildSearchIndex<T extends SearchableTask, G extends SearchableTag>(
  tasks: readonly T[],
  tagsByTask: ReadonlyMap<string, readonly G[]>,
): SearchEntry<T, G>[] {
  return tasks.map((task) => ({
    task,
    title: normalizeForSearch(task.title),
    description: normalizeForSearch(task.description ?? ''),
    tags: (tagsByTask.get(task.id) ?? []).map((tag) => ({
      tag,
      name: normalizeForSearch(tag.name),
    })),
  }));
}

export function searchTerms(query: string): string[] {
  return normalizeForSearch(query).split(/\s+/).filter(Boolean);
}

const collator = new Intl.Collator('es', { sensitivity: 'base', numeric: true });

// Sin texto ni etiqueta elegida no hay resultados.
// Orden: pendientes primero, las que coinciden en el título, prioritarias y alfabético.
export function searchTasks<T extends SearchableTask, G extends SearchableTag>(
  index: readonly SearchEntry<T, G>[],
  query: string,
  options: { tagId?: string | null } = {},
): SearchResult<T, G>[] {
  const terms = searchTerms(query);
  const tagId = options.tagId ?? null;
  if (terms.length === 0 && tagId === null) return [];

  const matches: { result: SearchResult<T, G>; inTitle: boolean }[] = [];
  for (const entry of index) {
    if (tagId !== null && !entry.tags.some(({ tag }) => tag.id === tagId)) continue;
    const found = terms.every(
      (term) =>
        entry.title.includes(term) ||
        entry.description.includes(term) ||
        entry.tags.some(({ name }) => name.includes(term)),
    );
    if (!found) continue;
    const matchedTags = entry.tags
      .filter(({ tag, name }) => tag.id === tagId || terms.some((term) => name.includes(term)))
      .map(({ tag }) => tag);
    matches.push({
      result: { task: entry.task, matchedTags },
      inTitle: terms.length > 0 && terms.every((term) => entry.title.includes(term)),
    });
  }

  return matches
    .sort((a, b) => {
      const taskA = a.result.task;
      const taskB = b.result.task;
      if (taskA.isDone !== taskB.isDone) return taskA.isDone ? 1 : -1;
      if (a.inTitle !== b.inTitle) return a.inTitle ? -1 : 1;
      if (taskA.isPriority !== taskB.isPriority) return taskA.isPriority ? -1 : 1;
      return collator.compare(taskA.title, taskB.title) || (taskA.id < taskB.id ? -1 : 1);
    })
    .map(({ result }) => result);
}
