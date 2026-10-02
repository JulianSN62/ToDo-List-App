import { describe, expect, it } from 'vitest';
import { dueGroupOf, groupByDue, type DueTask } from './dueGroups';

function task(id: string, dueDate: string | null, extra: Partial<DueTask> = {}): DueTask {
  return {
    id,
    position: 'a0',
    folderId: 'f1',
    isPriority: false,
    isDone: false,
    doneAt: null,
    dueDate,
    ...extra,
  };
}

// 2026-10-01 es jueves; 2026-10-03 sábado; 2026-10-04 domingo.
const THURSDAY = '2026-10-01';
const SATURDAY = '2026-10-03';
const SUNDAY = '2026-10-04';

describe('grupos de la vista Hoy', () => {
  it('ubica cada fecha en su grupo', () => {
    expect(dueGroupOf('2026-09-20', THURSDAY)).toBe('overdue');
    expect(dueGroupOf('2026-09-30', THURSDAY)).toBe('overdue');
    expect(dueGroupOf(THURSDAY, THURSDAY)).toBe('today');
    expect(dueGroupOf('2026-10-02', THURSDAY)).toBe('tomorrow');
    expect(dueGroupOf(SATURDAY, THURSDAY)).toBe('thisWeek');
    expect(dueGroupOf(SUNDAY, THURSDAY)).toBe('thisWeek');
    expect(dueGroupOf('2026-10-05', THURSDAY)).toBe('later');
  });

  it('el sábado, mañana es domingo y no queda nada para "Esta semana"', () => {
    expect(dueGroupOf(SUNDAY, SATURDAY)).toBe('tomorrow');
    expect(dueGroupOf('2026-10-05', SATURDAY)).toBe('later');
  });

  it('el domingo, el lunes es mañana y el resto queda para más adelante', () => {
    expect(dueGroupOf('2026-10-05', SUNDAY)).toBe('tomorrow');
    expect(dueGroupOf('2026-10-06', SUNDAY)).toBe('later');
  });

  it('agrupa en orden fijo y omite grupos vacíos, completadas y fechas inválidas', () => {
    const groups = groupByDue(
      [
        task('later', '2026-12-01'),
        task('today', THURSDAY),
        task('sin-fecha', null),
        task('hecha', THURSDAY, { isDone: true }),
        task('invalida', '2026-02-30'),
        task('vencida', '2026-09-01'),
      ],
      THURSDAY,
    );
    expect(groups.map((group) => group.key)).toEqual(['overdue', 'today', 'later']);
    expect(groups.flatMap((group) => group.tasks.map((item) => item.id))).toEqual([
      'vencida',
      'today',
      'later',
    ]);
  });

  it('dentro de un grupo: prioritarias, fecha, orden de carpetas y posición', () => {
    const folderOrder = new Map([
      ['f1', 0],
      ['f2', 1],
    ]);
    const groups = groupByDue(
      [
        task('reciente', '2026-09-30', { folderId: 'f1' }),
        task('antigua', '2026-09-20', { folderId: 'f2' }),
        task('prioritaria', '2026-09-30', { isPriority: true, folderId: 'f2' }),
        task('misma-fecha-f2', '2026-09-30', { folderId: 'f2' }),
        task('misma-fecha-f1-b', '2026-09-30', { folderId: 'f1', position: 'a1' }),
      ],
      THURSDAY,
      folderOrder,
    );
    expect(groups[0]?.tasks.map((item) => item.id)).toEqual([
      'prioritaria',
      'antigua',
      'reciente',
      'misma-fecha-f1-b',
      'misma-fecha-f2',
    ]);
  });
});
