import { ChevronDown } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useUiStore } from '@/app/uiStore';
import { taskRepo, type Tag, type Task } from '@/data';
import { es } from '@/i18n/es';
import { cn } from '@/lib/cn';
import { errorMeta, logger } from '@/lib/logger';
import { dropKeyInGroup, sortCompletedTasks, sortPendingTasks } from '@/lib/taskOrder';
import type { ActionItem } from '@/ui/action-menu';
import { SortableList } from '@/ui/sortable-list';
import { showErrorToast } from '@/ui/toast';
import { TaskRow } from './TaskRow';
import { deleteTaskWithUndo, toggleTaskDone } from './useTaskActions';
import { useTaskNavigation } from './useTaskNavigation';

// Lista de tareas de una carpeta: pendientes (prioritarias arriba, reordenables)
// y sección "Completadas" colapsada al final.
export function TaskList({
  tasks,
  today,
  retentionDays,
  selectedTaskId,
  tagsByTask,
  attachmentCounts,
  actionsFor,
}: {
  tasks: Task[];
  today: string;
  retentionDays: number;
  selectedTaskId: string | null;
  tagsByTask: ReadonlyMap<string, readonly Tag[]>;
  attachmentCounts: ReadonlyMap<string, number>;
  actionsFor: (task: Task, sortedPending: readonly Task[]) => ActionItem[];
}) {
  const { openTask } = useTaskNavigation();
  const expandedTaskIds = useUiStore((state) => state.expandedTaskIds);
  const toggleTaskExpanded = useUiStore((state) => state.toggleTaskExpanded);
  const [showCompleted, setShowCompleted] = useState(false);
  const pending = useMemo(() => sortPendingTasks(tasks), [tasks]);
  const completed = useMemo(() => sortCompletedTasks(tasks), [tasks]);

  function handleReorder(activeId: string, overId: string) {
    const key = dropKeyInGroup(pending, activeId, overId);
    if (!key) return;
    void taskRepo.setPosition(activeId, key).catch((error: unknown) => {
      logger.error('No se pudo reordenar la tarea', errorMeta(error));
      showErrorToast();
    });
  }

  const rowProps = (task: Task) => ({
    task,
    today,
    retentionDays,
    selected: task.id === selectedTaskId,
    actions: actionsFor(task, pending),
    expanded: expandedTaskIds.has(task.id),
    tags: tagsByTask.get(task.id),
    attachmentCount: attachmentCounts.get(task.id),
    onToggleExpanded: () => toggleTaskExpanded(task.id),
    onOpen: () => openTask(task.id),
    onToggleDone: () => toggleTaskDone(task),
    onDelete: () => deleteTaskWithUndo(task),
  });

  return (
    <div className="flex flex-col">
      <SortableList
        items={pending}
        onReorder={handleReorder}
        renderItem={(task, handle) => <TaskRow {...rowProps(task)} handle={handle} />}
      />

      {completed.length > 0 ? (
        <section className="mt-6">
          <button
            type="button"
            aria-expanded={showCompleted}
            onClick={() => setShowCompleted((value) => !value)}
            className="flex h-12 w-full items-center gap-2 px-4 text-left text-body-sm font-medium text-muted hover:text-fg"
          >
            <ChevronDown
              aria-hidden
              className={cn(
                'size-4 transition-transform duration-(--duration-fast)',
                !showCompleted && '-rotate-90',
              )}
            />
            {es.tasks.completedSection(completed.length)}
          </button>
          {showCompleted ? (
            <ul>
              {completed.map((task) => (
                <li key={task.id}>
                  <TaskRow {...rowProps(task)} />
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
