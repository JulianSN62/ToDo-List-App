import {
  ArrowDown,
  ArrowUp,
  BellPlus,
  FolderInput,
  FolderOpen,
  MapPin,
  MapPinOff,
  Pencil,
  Star,
  StarOff,
  Trash2,
} from 'lucide-react';
import { useCallback, useState, type ReactNode } from 'react';
import { reminderRepo, taskRepo, type Task } from '@/data';
import { es } from '@/i18n/es';
import { errorMeta, logger } from '@/lib/logger';
import type { MoveDirection } from '@/lib/ordering';
import type { ActionItem } from '@/ui/action-menu';
import { showErrorToast, showToast, showUndoToast } from '@/ui/toast';
import { FolderPickerSheet } from '../folders/FolderPickerSheet';
import { ReminderSheet } from '../reminders/ReminderSheet';
import { useNotificationPermission } from '../reminders/useNotificationPermission';
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
  /** Lista con orden manual: Subir/Bajar (sin esto, no se ofrecen). */
  reorder?: {
    canMoveUp: boolean;
    canMoveDown: boolean;
    move: (direction: MoveDirection) => void;
  };
}

export function useTaskActions(): {
  /** Se arma al abrir el menú de la tarea. La función no cambia entre renders. */
  actionsFor: (task: Task, options?: TaskActionOptions) => ActionItem[];
  dialogs: ReactNode;
} {
  const { openTask } = useTaskNavigation();
  const [moving, setMoving] = useState<Task | null>(null);
  // Tarea a la que se le agrega un recordatorio (se guarda al tocar "Listo").
  const [reminderFor, setReminderFor] = useState<Task | null>(null);
  const [reminderKey, setReminderKey] = useState(0);
  const askNotificationPermission = useNotificationPermission();

  const actionsFor = useCallback(
    (task: Task, options: TaskActionOptions = {}): ActionItem[] => {
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
          {
            key: 'pin',
            label: task.isPinned ? es.reminders.menuUnpin : es.reminders.menuPin,
            icon: task.isPinned ? <MapPinOff /> : <MapPin />,
            onSelect: () =>
              void taskRepo
                .setPinned(task.id, !task.isPinned)
                .then(() => {
                  showToast(task.isPinned ? es.reminders.unpinnedToast : es.reminders.pinnedToast);
                  if (!task.isPinned) askNotificationPermission();
                })
                .catch(report('No se pudo anclar la tarea')),
          },
          {
            key: 'reminder',
            label: es.reminders.add,
            icon: <BellPlus />,
            onSelect: () => {
              setReminderFor(task);
              setReminderKey((current) => current + 1);
            },
          },
        );
        const { reorder } = options;
        if (reorder) {
          items.push(
            {
              key: 'up',
              label: es.common.moveUp,
              icon: <ArrowUp />,
              disabled: !reorder.canMoveUp,
              onSelect: () => reorder.move('up'),
            },
            {
              key: 'down',
              label: es.common.moveDown,
              icon: <ArrowDown />,
              disabled: !reorder.canMoveDown,
              onSelect: () => reorder.move('down'),
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
    },
    [openTask, askNotificationPermission],
  );

  const dialogs = (
    <>
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
      <ReminderSheet
        open={reminderFor !== null}
        formKey={reminderKey}
        request={reminderFor ? { mode: 'create' } : null}
        onClose={() => setReminderFor(null)}
        onSubmit={(value) => {
          if (!reminderFor) return;
          void reminderRepo
            .add(reminderFor.id, {
              message: value.message,
              fireAts: value.times.map((time) => time.fireAt),
            })
            .then(() => {
              showToast(es.reminders.added);
              askNotificationPermission();
            })
            .catch(report('No se pudo guardar el recordatorio'));
        }}
      />
    </>
  );

  return { actionsFor, dialogs };
}
