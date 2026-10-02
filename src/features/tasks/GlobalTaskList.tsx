import type { ReactNode } from 'react';
import { useUiStore } from '@/app/uiStore';
import type { Tag, Task } from '@/data';
import { TaskRow } from './TaskRow';
import { deleteTaskWithUndo, toggleTaskDone, useTaskActions } from './useTaskActions';

// Lista plana de tareas de varias carpetas (Hoy, Buscar, filtros de carpeta).
// No se reordena: cada fila muestra su carpeta debajo del título y permite ir a ella.
export function GlobalTaskList({
  tasks,
  today,
  retentionDays,
  tagsByTask,
  attachmentCounts,
  subtitleFor,
  onOpen,
  onGoToFolder,
}: {
  tasks: readonly Task[];
  today: string;
  retentionDays: number;
  tagsByTask: ReadonlyMap<string, readonly Tag[]>;
  attachmentCounts: ReadonlyMap<string, number>;
  subtitleFor: (task: Task) => ReactNode;
  onOpen: (task: Task) => void;
  onGoToFolder: (task: Task) => void;
}) {
  const expandedTaskIds = useUiStore((state) => state.expandedTaskIds);
  const toggleTaskExpanded = useUiStore((state) => state.toggleTaskExpanded);
  const taskActions = useTaskActions();

  return (
    <>
      <ul className="flex flex-col">
        {tasks.map((task) => (
          <li key={task.id}>
            <TaskRow
              task={task}
              today={today}
              retentionDays={retentionDays}
              tags={tagsByTask.get(task.id)}
              attachmentCount={attachmentCounts.get(task.id)}
              subtitle={subtitleFor(task)}
              actions={taskActions.actionsFor(task, null, {
                open: () => onOpen(task),
                goToFolder: () => onGoToFolder(task),
              })}
              expanded={expandedTaskIds.has(task.id)}
              onToggleExpanded={() => toggleTaskExpanded(task.id)}
              onOpen={() => onOpen(task)}
              onToggleDone={() => toggleTaskDone(task)}
              onDelete={() => deleteTaskWithUndo(task)}
              onGoToFolder={() => onGoToFolder(task)}
            />
          </li>
        ))}
      </ul>
      {taskActions.dialogs}
    </>
  );
}
