import { act, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Task } from '@/data';
import { TaskList } from './TaskList';

// Listas largas: al cambiar una tarea solo se vuelve a dibujar su fila. Se reemplaza la
// fila por una versión mínima memorizada que cuenta sus renders.
const rendered = vi.fn<(id: string) => void>();

vi.mock('./TaskRow', async () => {
  const { memo } = await import('react');
  return {
    TaskRow: memo(function TaskRowSpy({ task }: { task: Task }) {
      rendered(task.id);
      return <span>{task.title}</span>;
    }),
  };
});
vi.mock('@/data', () => ({ taskRepo: { setPosition: vi.fn(), setDone: vi.fn() } }));

function makeTask(index: number, extra: Partial<Task> = {}): Task {
  return {
    id: `t${index}`,
    folderId: 'f1',
    title: `Tarea ${index}`,
    description: null,
    dueDate: null,
    isPriority: false,
    color: null,
    position: `a${String(index).padStart(3, '0')}`,
    isDone: false,
    doneAt: null,
    isPinned: false,
    createdAt: null,
    updatedAt: null,
    ...extra,
  };
}

const tagsByTask = new Map();
const attachmentCounts = new Map();
const actionsFor = vi.fn(() => []);

function List({ tasks }: { tasks: Task[] }) {
  return (
    <MemoryRouter>
      <TaskList
        tasks={tasks}
        today="2026-10-03"
        retentionDays={7}
        selectedTaskId={null}
        tagsByTask={tagsByTask}
        attachmentCounts={attachmentCounts}
        actionsFor={actionsFor}
      />
    </MemoryRouter>
  );
}

describe('TaskList con muchas tareas', () => {
  beforeEach(() => {
    rendered.mockReset();
  });

  it('al cambiar una tarea solo se vuelve a dibujar esa fila', () => {
    const tasks = Array.from({ length: 200 }, (_, index) => makeTask(index));
    const view = render(<List tasks={tasks} />);
    expect(rendered).toHaveBeenCalledTimes(200);

    rendered.mockReset();
    const edited = tasks.map((task) => (task.id === 't50' ? { ...task, title: 'Editada' } : task));
    act(() => view.rerender(<List tasks={edited} />));
    expect(rendered.mock.calls).toEqual([['t50']]);
  });

  it('al marcar una prioritaria, cambia solo lo que se movió de grupo o de borde', () => {
    const tasks = Array.from({ length: 50 }, (_, index) => makeTask(index));
    const view = render(<List tasks={tasks} />);
    rendered.mockReset();
    const edited = tasks.map((task) => (task.id === 't20' ? { ...task, isPriority: true } : task));
    act(() => view.rerender(<List tasks={edited} />));
    // La tarea marcada se vuelve a dibujar; el resto conserva sus props.
    expect(rendered).toHaveBeenCalledWith('t20');
    expect(rendered.mock.calls.length).toBeLessThanOrEqual(3);
  });
});
