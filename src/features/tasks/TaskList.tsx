import { ChevronDown, CircleCheck } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useUiStore } from '@/app/uiStore';
import { taskRepo, type Tag, type Task } from '@/data';
import { es } from '@/i18n/es';
import { cn } from '@/lib/cn';
import { errorMeta, logger } from '@/lib/logger';
import type { MoveDirection } from '@/lib/ordering';
import {
  dropKeyInGroup,
  sortCompletedTasks,
  sortPendingTasks,
  stepAvailability,
  stepKeyInGroup,
  type StepAvailability,
} from '@/lib/taskOrder';
import type { ActionItem } from '@/ui/action-menu';
import { EmptyState } from '@/ui/empty-state';
import { SortableList } from '@/ui/sortable-list';
import { showErrorToast } from '@/ui/toast';
import { TaskRow } from './TaskRow';
import { deleteTaskWithUndo, toggleTaskDone, type TaskActionOptions } from './useTaskActions';
import { useTaskNavigation } from './useTaskNavigation';

// Lista de tareas de una carpeta: pendientes (prioritarias arriba, reordenables)
// y sección "Completadas" colapsada al final.

const taskTitle = (task: Task) => task.title;

function reportReorderError(error: unknown) {
  logger.error('No se pudo reordenar la tarea', errorMeta(error));
  showErrorToast();
}
export function TaskList({
  tasks,
  today,
  retentionDays,
  selectedTaskId,
  tagsByTask,
  attachmentCounts,
  reminderCounts,
  actionsFor,
}: {
  tasks: Task[];
  today: string;
  retentionDays: number;
  selectedTaskId: string | null;
  tagsByTask: ReadonlyMap<string, readonly Tag[]>;
  attachmentCounts: ReadonlyMap<string, number>;
  reminderCounts?: ReadonlyMap<string, number>;
  /** Debe ser estable entre renders (useTaskActions lo es). */
  actionsFor: (task: Task, options?: TaskActionOptions) => ActionItem[];
}) {
  const { openTask } = useTaskNavigation();
  const expandedTaskIds = useUiStore((state) => state.expandedTaskIds);
  const toggleTaskExpanded = useUiStore((state) => state.toggleTaskExpanded);
  const [showCompleted, setShowCompleted] = useState(false);
  const pending = useMemo(() => sortPendingTasks(tasks), [tasks]);
  const completed = useMemo(() => sortCompletedTasks(tasks), [tasks]);
  const steps = useMemo(() => stepAvailability(pending), [pending]);

  // Las acciones leen la lista más reciente al ejecutarse; así sus funciones no cambian
  // con cada edición y las filas que no cambiaron no se vuelven a dibujar.
  const pendingRef = useRef(pending);
  useEffect(() => {
    pendingRef.current = pending;
  }, [pending]);

  function handleReorder(activeId: string, overId: string) {
    const key = dropKeyInGroup(pending, activeId, overId);
    if (!key) return;
    void taskRepo.setPosition(activeId, key).catch(reportReorderError);
  }

  const moveTask = useCallback((taskId: string, direction: MoveDirection) => {
    const key = stepKeyInGroup(pendingRef.current, taskId, direction);
    if (!key) return;
    void taskRepo.setPosition(taskId, key).catch(reportReorderError);
  }, []);

  const getActions = useCallback(
    (task: Task, step: StepAvailability | null) =>
      actionsFor(
        task,
        step
          ? {
              reorder: {
                canMoveUp: step.up,
                canMoveDown: step.down,
                move: (direction) => moveTask(task.id, direction),
              },
            }
          : undefined,
      ),
    [actionsFor, moveTask],
  );
  const handleOpen = useCallback((task: Task) => openTask(task.id), [openTask]);

  const rowProps = (task: Task) => ({
    task,
    today,
    retentionDays,
    selected: task.id === selectedTaskId,
    expanded: expandedTaskIds.has(task.id),
    tags: tagsByTask.get(task.id),
    attachmentCount: attachmentCounts.get(task.id),
    reminderCount: reminderCounts?.get(task.id),
    getActions,
    onToggleExpanded: toggleTaskExpanded,
    onOpen: handleOpen,
    onToggleDone: toggleTaskDone,
    onDelete: deleteTaskWithUndo,
  });

  return (
    <div className="flex flex-col">
      <SortableList
        items={pending}
        itemLabel={taskTitle}
        onReorder={handleReorder}
        renderItem={(task, handle) => (
          <TaskRow
            {...rowProps(task)}
            handle={handle}
            canMoveUp={steps.get(task.id)?.up}
            canMoveDown={steps.get(task.id)?.down}
          />
        )}
      />

      {pending.length === 0 && completed.length > 0 ? (
        <EmptyState icon={<CircleCheck />} title={es.tasks.allDone} className="py-8" />
      ) : null}

      {completed.length > 0 ? (
        <section className="mt-6">
          <button
            type="button"
            aria-expanded={showCompleted}
            onClick={() => setShowCompleted((value) => !value)}
            className="flex h-12 w-full items-center gap-2 px-4 text-left text-body-sm font-medium text-muted -outline-offset-2 hover:text-fg"
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
