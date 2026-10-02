// Filtros de la lista de tareas: "Solo prioritarias" y una etiqueta.

export interface TaskFilters {
  priorityOnly: boolean;
  tagId: string | null;
}

export const NO_TASK_FILTERS: TaskFilters = { priorityOnly: false, tagId: null };

export function hasActiveFilters(filters: TaskFilters): boolean {
  return filters.priorityOnly || filters.tagId !== null;
}

export function filterTasks<T extends { id: string; isPriority: boolean }>(
  tasks: readonly T[],
  filters: TaskFilters,
  tagsByTask: ReadonlyMap<string, readonly { id: string }[]>,
): T[] {
  return tasks.filter((task) => {
    if (filters.priorityOnly && !task.isPriority) return false;
    if (filters.tagId !== null) {
      const tags = tagsByTask.get(task.id) ?? [];
      if (!tags.some((tag) => tag.id === filters.tagId)) return false;
    }
    return true;
  });
}
