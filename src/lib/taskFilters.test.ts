import { describe, expect, it } from 'vitest';
import { filterTasks, hasActiveFilters, NO_TASK_FILTERS } from './taskFilters';

const tasks = [
  { id: 't1', isPriority: true },
  { id: 't2', isPriority: false },
  { id: 't3', isPriority: true },
];

const tagsByTask = new Map([
  ['t1', [{ id: 'urgente' }]],
  ['t2', [{ id: 'urgente' }, { id: 'facu' }]],
]);

const ids = (list: { id: string }[]) => list.map((item) => item.id);

describe('filtros de tareas', () => {
  it('sin filtros devuelve todo', () => {
    expect(hasActiveFilters(NO_TASK_FILTERS)).toBe(false);
    expect(ids(filterTasks(tasks, NO_TASK_FILTERS, tagsByTask))).toEqual(['t1', 't2', 't3']);
  });

  it('"Solo prioritarias"', () => {
    const filters = { priorityOnly: true, tagId: null };
    expect(hasActiveFilters(filters)).toBe(true);
    expect(ids(filterTasks(tasks, filters, tagsByTask))).toEqual(['t1', 't3']);
  });

  it('por etiqueta', () => {
    expect(ids(filterTasks(tasks, { priorityOnly: false, tagId: 'urgente' }, tagsByTask))).toEqual([
      't1',
      't2',
    ]);
    expect(ids(filterTasks(tasks, { priorityOnly: false, tagId: 'nada' }, tagsByTask))).toEqual([]);
  });

  it('combina ambos filtros', () => {
    expect(ids(filterTasks(tasks, { priorityOnly: true, tagId: 'urgente' }, tagsByTask))).toEqual([
      't1',
    ]);
  });
});
