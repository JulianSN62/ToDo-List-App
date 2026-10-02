import { parseInstant } from './dates';
import {
  comparePositioned,
  keyForDrop,
  keyForIndex,
  keyForStep,
  type MoveDirection,
  type Positioned,
} from './ordering';

// Orden mostrado de tareas: prioritarias arriba y después el orden manual.
// Marcar prioridad NO cambia la posición guardada: al desmarcar vuelve sola a su lugar.

export interface OrderableTask extends Positioned {
  isPriority: boolean;
  isDone: boolean;
  doneAt: string | null;
}

export function comparePending(a: OrderableTask, b: OrderableTask): number {
  if (a.isPriority !== b.isPriority) return a.isPriority ? -1 : 1;
  return comparePositioned(a, b);
}

export function sortPendingTasks<T extends OrderableTask>(tasks: readonly T[]): T[] {
  return tasks.filter((task) => !task.isDone).sort(comparePending);
}

// Listas que cruzan carpetas (filtros, Hoy): prioritarias arriba, después en el orden
// del árbol de carpetas y dentro de cada carpeta en su orden manual.
export function compareAcrossFolders<T extends OrderableTask & { folderId: string }>(
  a: T,
  b: T,
  folderOrder: ReadonlyMap<string, number>,
): number {
  if (a.isPriority !== b.isPriority) return a.isPriority ? -1 : 1;
  const orderA = folderOrder.get(a.folderId) ?? Number.MAX_SAFE_INTEGER;
  const orderB = folderOrder.get(b.folderId) ?? Number.MAX_SAFE_INTEGER;
  if (orderA !== orderB) return orderA - orderB;
  return comparePositioned(a, b);
}

// Completadas: la más reciente primero.
export function sortCompletedTasks<T extends OrderableTask>(tasks: readonly T[]): T[] {
  const time = (task: T) => parseInstant(task.doneAt)?.getTime() ?? 0;
  return tasks
    .filter((task) => task.isDone)
    .sort((a, b) => time(b) - time(a) || comparePositioned(a, b));
}

// Grupo visible de una tarea: prioritarias entre prioritarias, el resto entre el resto.
function groupOf<T extends OrderableTask>(sortedPending: readonly T[], task: T): T[] {
  return sortedPending.filter((item) => item.isPriority === task.isPriority);
}

// Subir o bajar dentro del grupo visible. Devuelve la nueva posición o null si no se puede.
export function stepKeyInGroup<T extends OrderableTask>(
  sortedPending: readonly T[],
  taskId: string,
  direction: MoveDirection,
): string | null {
  const task = sortedPending.find((item) => item.id === taskId);
  if (!task) return null;
  return keyForStep(groupOf(sortedPending, task), taskId, direction);
}

export function canStepInGroup<T extends OrderableTask>(
  sortedPending: readonly T[],
  taskId: string,
  direction: MoveDirection,
): boolean {
  return stepKeyInGroup(sortedPending, taskId, direction) !== null;
}

// Arrastrar y soltar: si se suelta sobre una tarea del otro grupo, queda en el borde de su propio grupo.
export function dropKeyInGroup<T extends OrderableTask>(
  sortedPending: readonly T[],
  activeId: string,
  overId: string,
): string | null {
  const active = sortedPending.find((item) => item.id === activeId);
  const over = sortedPending.find((item) => item.id === overId);
  if (!active || !over || activeId === overId) return null;
  const group = groupOf(sortedPending, active);
  if (over.isPriority === active.isPriority) {
    return keyForDrop(group, activeId, overId);
  }
  // El destino está en el otro grupo: prioritaria -> al final de su grupo; no prioritaria -> al principio.
  const currentIndex = group.findIndex((item) => item.id === activeId);
  const targetIndex = active.isPriority ? group.length - 1 : 0;
  if (currentIndex === targetIndex) return null;
  return keyForIndex(group, activeId, targetIndex);
}
