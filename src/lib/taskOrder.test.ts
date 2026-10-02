import { describe, expect, it } from 'vitest';
import {
  compareAcrossFolders,
  dropKeyInGroup,
  sortCompletedTasks,
  sortPendingTasks,
  stepKeyInGroup,
  type OrderableTask,
} from './taskOrder';

function task(id: string, position: string, extra: Partial<OrderableTask> = {}): OrderableTask {
  return { id, position, isPriority: false, isDone: false, doneAt: null, ...extra };
}

describe('orden de tareas pendientes', () => {
  const tasks = [
    task('a', 'a0'),
    task('b', 'a1', { isPriority: true }),
    task('c', 'a2'),
    task('d', 'a3', { isPriority: true }),
    task('e', 'a4', { isDone: true, doneAt: '2026-10-01T10:00:00Z' }),
  ];

  it('muestra prioritarias arriba sin cambiar su posición guardada', () => {
    const sorted = sortPendingTasks(tasks);
    expect(sorted.map((item) => item.id)).toEqual(['b', 'd', 'a', 'c']);
    expect(sorted.find((item) => item.id === 'b')?.position).toBe('a1');
  });

  it('al quitar la prioridad la tarea vuelve a su lugar original', () => {
    const unmarked = tasks.map((item) => (item.id === 'b' ? { ...item, isPriority: false } : item));
    expect(sortPendingTasks(unmarked).map((item) => item.id)).toEqual(['d', 'a', 'b', 'c']);
  });

  it('sube y baja solo dentro de su grupo visible', () => {
    const sorted = sortPendingTasks(tasks);
    // "a" es la primera del grupo no prioritario: no puede subir por encima de las prioritarias
    expect(stepKeyInGroup(sorted, 'a', 'up')).toBeNull();
    // "c" puede subir dentro de su grupo
    const key = stepKeyInGroup(sorted, 'c', 'up');
    expect(key).not.toBeNull();
    expect((key as string) < 'a0').toBe(true);
    // "d" es la última prioritaria: no puede bajar al grupo de no prioritarias
    expect(stepKeyInGroup(sorted, 'd', 'down')).toBeNull();
  });

  it('al soltar sobre otro grupo queda en el borde del propio', () => {
    const sorted = sortPendingTasks(tasks);
    // Arrastrar "c" (no prioritaria) sobre "b" (prioritaria): queda primera de las no prioritarias
    const key = dropKeyInGroup(sorted, 'c', 'b');
    expect(key).not.toBeNull();
    expect((key as string) < 'a0').toBe(true);
    // "a" ya es la primera de su grupo: no hay cambios
    expect(dropKeyInGroup(sorted, 'a', 'b')).toBeNull();
  });
});

describe('orden de completadas', () => {
  it('ordena por fecha de completado, la más reciente primero', () => {
    const tasks = [
      task('x', 'a0', { isDone: true, doneAt: '2026-10-01 08:00:00Z' }),
      task('y', 'a1', { isDone: true, doneAt: '2026-10-02T08:00:00.000Z' }),
      task('z', 'a2'),
    ];
    expect(sortCompletedTasks(tasks).map((item) => item.id)).toEqual(['y', 'x']);
  });
});

describe('orden de listas que cruzan carpetas', () => {
  it('prioritarias arriba, después el orden del árbol y la posición', () => {
    const folderOrder = new Map([
      ['uni', 0],
      ['clientes', 1],
    ]);
    const tasks = [
      { ...task('c2', 'a1'), folderId: 'clientes' },
      { ...task('u1', 'a5'), folderId: 'uni' },
      { ...task('c1', 'a0'), folderId: 'clientes' },
      { ...task('cp', 'a9', { isPriority: true }), folderId: 'clientes' },
      { ...task('x', 'a0'), folderId: 'desconocida' },
    ];
    expect(
      [...tasks].sort((a, b) => compareAcrossFolders(a, b, folderOrder)).map((item) => item.id),
    ).toEqual(['cp', 'u1', 'c1', 'c2', 'x']);
  });
});
