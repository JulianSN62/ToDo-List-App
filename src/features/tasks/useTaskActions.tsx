import {
  ArrowDown,
  ArrowUp,
  FolderInput,
  FolderOpen,
  Pencil,
  Star,
  StarOff,
  Trash2,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { taskRepo, type Task } from '@/data';
import { es } from '@/i18n/es';
import { errorMeta, logger } from '@/lib/logger';
import { stepKeyInGroup } from '@/lib/taskOrder';
import type { ActionItem } from '@/ui/action-menu';
import { showErrorToast, showToast, showUndoToast } from '@/ui/toast';
import { FolderPickerSheet } from '../folders/FolderPickerSheet';
import { useTaskNavigation } from './useTaskNavigation';

// Acciones sobre una tarea, compartidas por la fila, el menú y la ventana de edición.

function report(message: string) {
  return (error: unknown) => {
    logger.error(message, errorMeta(error));
    showErrorToast();
  };
}

export function toggleTaskDone(task: Task): void {
  void taskRepo.setDone(task.id, !task.isDone).catch(report('No se pudo actualizar la tarea'));
}

export function deleteTaskWithUndo(task: Task, afterDelete?: () => void): void {
  void taskRepo
    .softDelete(task.id)
    .then(() => {
      afterDelete?.();
      showUndoToast(es.tasks.deleted, () => {
        void taskRepo.restore(task.id).catch(report('No se pudo deshacer el borrado'));
      });
    })
    .catch(report('No se pudo eliminar la tarea'));
}

export interface TaskActionOptions {
  /** Abre la tarea de otra forma (las vistas globales usan una ventana propia). */
  open?: () => void;
  /** Vistas globales: "Ir a la carpeta". */
  goToFolder?: () => void;
}

export function useTaskActions(): {
  /** sortedPending = null: lista sin orden manual (sin Subir/Bajar). */
  actionsFor: (
    task: Task,
    sortedPending: readonly Task[] | null,
    options?: TaskActionOptions,
  ) => ActionItem[];
  dialogs: ReactNode;
} {
  const { openTask } = useTaskNavigation();
  const [moving, setMoving] = useState<Task | null>(null);

  function step(task: Task, sortedPending: readonly Task[], direction: 'up' | 'down') {
    const key = stepKeyInGroup(sortedPending, task.id, direction);
    if (!key) return;
    void taskRepo.setPosition(task.id, key).catch(report('No se pudo reordenar la tarea'));
  }

  function actionsFor(
    task: Task,
    sortedPending: readonly Task[] | null,
    options: TaskActionOptions = {},
  ): ActionItem[] {
    const items: ActionItem[] = [
      {
        key: 'edit',
        label: es.common.edit,
        icon: <Pencil />,
        onSelect: options.open ?? (() => openTask(task.id)),
      },
    ];
    if (options.goToFolder) {
      items.push({
        key: 'folder',
        label: es.tasks.goToFolder,
        icon: <FolderOpen />,
        onSelect: options.goToFolder,
      });
    }
    const move: ActionItem = {
      key: 'move',
      label: es.tasks.moveTo,
      icon: <FolderInput />,
      onSelect: () => setMoving(task),
    };
    if (task.isDone) {
      items.push(move);
    } else {
      items.push(
        {
          key: 'priority',
          label: task.isPriority ? es.tasks.unmarkPriority : es.tasks.markPriority,
          icon: task.isPriority ? <StarOff /> : <Star />,
          onSelect: () =>
            void taskRepo
              .update(task.id, { isPriority: !task.isPriority })
              .catch(report('No se pudo cambiar la prioridad')),
        },
        move,
      );
      if (sortedPending !== null) {
        items.push(
          {
            key: 'up',
            label: es.common.moveUp,
            icon: <ArrowUp />,
            disabled: stepKeyInGroup(sortedPending, task.id, 'up') === null,
            onSelect: () => step(task, sortedPending, 'up'),
          },
          {
            key: 'down',
            label: es.common.moveDown,
            icon: <ArrowDown />,
            disabled: stepKeyInGroup(sortedPending, task.id, 'down') === null,
            onSelect: () => step(task, sortedPending, 'down'),
          },
        );
      }
    }
    items.push({
      key: 'delete',
      label: es.common.delete,
      icon: <Trash2 />,
      danger: true,
      onSelect: () => deleteTaskWithUndo(task),
    });
    return items;
  }

  const dialogs = (
    <FolderPickerSheet
      open={moving !== null}
      onOpenChange={(open) => {
        if (!open) setMoving(null);
      }}
      title={moving ? es.tasks.moveTitle(moving.title) : ''}
      allowRoot={false}
      disabledIds={new Set<string>()}
      currentId={moving?.folderId ?? null}
      onConfirm={(targetId) => {
        if (!moving || !targetId) return;
        void taskRepo
          .move(moving.id, targetId)
          .then(() => showToast(es.tasks.moved))
          .catch(report('No se pudo mover la tarea'));
      }}
    />
  );

  return { actionsFor, dialogs };
}
