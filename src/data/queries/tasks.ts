import { useQuery } from '@powersync/react';
import { useMemo } from 'react';
import { toTask } from '../mappers';
import type { TaskRow } from '../schema';
import type { Task } from '../types';

// Lecturas reactivas de tareas.

type TaskRowWithId = TaskRow & { id: string };

// Las listas conservan el mismo objeto para cada tarea que no cambió (la consulta compara
// fila por fila y la conversión se recuerda por fila). Así, con listas largas, las filas
// memorizadas solo se vuelven a dibujar cuando cambia su propia tarea.
const ROW_COMPARATOR = {
  keyBy: (row: TaskRowWithId) => row.id,
  compareBy: (row: TaskRowWithId) => JSON.stringify(row),
};
const converted = new WeakMap<object, Task>();

function toTaskCached(row: Readonly<TaskRowWithId>): Task {
  let task = converted.get(row);
  if (!task) {
    task = toTask(row);
    converted.set(row, task);
  }
  return task;
}

function useTaskList(sql: string, params: unknown[] = []): { tasks: Task[]; isLoading: boolean } {
  const { data, isLoading } = useQuery<TaskRowWithId>(sql, params, {
    rowComparator: ROW_COMPARATOR,
  });
  return useMemo(() => ({ tasks: data.map(toTaskCached), isLoading }), [data, isLoading]);
}

export function useFolderTasks(folderId: string | null): { tasks: Task[]; isLoading: boolean } {
  return useTaskList('SELECT * FROM tasks WHERE folder_id = ? AND deleted_at IS NULL', [
    folderId ?? '',
  ]);
}

// Pendientes con fecha límite de todas las carpetas (vista Hoy / Próximas).
export function useDueTasks(): { tasks: Task[]; isLoading: boolean } {
  return useTaskList(
    'SELECT * FROM tasks WHERE deleted_at IS NULL AND is_done = 0 AND due_date IS NOT NULL',
  );
}

// Pendientes de todas las carpetas (filtros de la vista de carpeta).
export function usePendingTasks(): { tasks: Task[]; isLoading: boolean } {
  return useTaskList('SELECT * FROM tasks WHERE deleted_at IS NULL AND is_done = 0');
}

// Tareas ancladas pendientes (Ajustes → Notificaciones).
export function usePinnedTasks(): { tasks: Task[]; isLoading: boolean } {
  return useTaskList(
    'SELECT * FROM tasks WHERE deleted_at IS NULL AND is_done = 0 AND is_pinned = 1 ORDER BY title',
  );
}

// Todas las tareas no eliminadas (búsqueda global).
export function useAllTasks(): { tasks: Task[]; isLoading: boolean } {
  return useTaskList('SELECT * FROM tasks WHERE deleted_at IS NULL');
}

export function useTask(taskId: string | null): { task: Task | null; isLoading: boolean } {
  const { data, isLoading, isFetching } = useQuery<TaskRow>(
    'SELECT * FROM tasks WHERE id = ? AND deleted_at IS NULL LIMIT 1',
    [taskId ?? ''],
  );
  // Al cambiar de tarea, la consulta devuelve por un instante el resultado anterior:
  // cuenta como "cargando" para no mostrar "no existe" de forma pasajera.
  const loading = isLoading || isFetching;
  return useMemo(() => {
    const row = data[0];
    return { task: row ? toTask(row) : null, isLoading: loading };
  }, [data, loading]);
}
