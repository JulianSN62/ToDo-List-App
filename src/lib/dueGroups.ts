import { diffInLocalDays, isValidLocalDate, parseLocalDate } from './dates';
import { comparePositioned } from './ordering';
import type { OrderableTask } from './taskOrder';

// Vista Hoy / Próximas: tareas pendientes con fecha límite agrupadas por cercanía.
// "Esta semana" va desde pasado mañana hasta el domingo (semana de lunes a domingo).

export type DueGroupKey = 'overdue' | 'today' | 'tomorrow' | 'thisWeek' | 'later';

export const DUE_GROUP_ORDER: readonly DueGroupKey[] = [
  'overdue',
  'today',
  'tomorrow',
  'thisWeek',
  'later',
];

// Días que faltan para el domingo de la semana de "today" (0 si hoy es domingo).
function daysUntilSunday(today: string): number {
  const parts = parseLocalDate(today);
  if (!parts) return 0;
  const weekday = new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay(); // 0 = domingo
  return (7 - weekday) % 7;
}

export function dueGroupOf(dueDate: string, today: string): DueGroupKey {
  const diff = diffInLocalDays(dueDate, today);
  if (diff < 0) return 'overdue';
  if (diff === 0) return 'today';
  if (diff === 1) return 'tomorrow';
  if (diff <= daysUntilSunday(today)) return 'thisWeek';
  return 'later';
}

export interface DueTask extends OrderableTask {
  folderId: string;
  dueDate: string | null;
}

export interface DueGroup<T> {
  key: DueGroupKey;
  tasks: T[];
}

// Dentro de cada grupo: prioritarias arriba, después la fecha más próxima (o la más vencida),
// el orden de las carpetas en el árbol y el orden manual.
function compareInGroup<T extends DueTask>(
  a: T,
  b: T,
  folderOrder: ReadonlyMap<string, number>,
): number {
  if (a.isPriority !== b.isPriority) return a.isPriority ? -1 : 1;
  const dueA = a.dueDate ?? '';
  const dueB = b.dueDate ?? '';
  if (dueA !== dueB) return dueA < dueB ? -1 : 1;
  const orderA = folderOrder.get(a.folderId) ?? Number.MAX_SAFE_INTEGER;
  const orderB = folderOrder.get(b.folderId) ?? Number.MAX_SAFE_INTEGER;
  if (orderA !== orderB) return orderA - orderB;
  return comparePositioned(a, b);
}

// Agrupa las pendientes con fecha válida; los grupos vacíos no se devuelven.
export function groupByDue<T extends DueTask>(
  tasks: readonly T[],
  today: string,
  folderOrder: ReadonlyMap<string, number> = new Map(),
): DueGroup<T>[] {
  const buckets = new Map<DueGroupKey, T[]>();
  for (const task of tasks) {
    if (task.isDone || !task.dueDate || !isValidLocalDate(task.dueDate)) continue;
    const key = dueGroupOf(task.dueDate, today);
    const list = buckets.get(key);
    if (list) list.push(task);
    else buckets.set(key, [task]);
  }
  return DUE_GROUP_ORDER.flatMap((key) => {
    const list = buckets.get(key);
    if (!list) return [];
    return [{ key, tasks: list.sort((a, b) => compareInGroup(a, b, folderOrder)) }];
  });
}
