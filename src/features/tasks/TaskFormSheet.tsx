import { FolderOpen, X } from 'lucide-react';
import { Suspense, useCallback, useState, type ReactNode } from 'react';
import { useToday } from '@/app/hooks/useToday';
import { lazyComponent } from '@/app/lazyComponent';
import { useUiStore } from '@/app/uiStore';
import { useTask, useTaskFiles, useTaskLinks, useTaskTagIds } from '@/data';
import { es } from '@/i18n/es';
import { IconButton } from '@/ui/button';
import { ConfirmDialog } from '@/ui/confirm-dialog';
import { Sheet, SheetBody } from '@/ui/sheet';

// Ventanas de tarea: "Nueva tarea" y "Editar tarea". Bloquean la app hasta cerrarlas
// (bottom sheet alto en mobile, modal centrado en desktop). El formulario se carga a demanda.

const TaskForm = lazyComponent(() => import('./TaskForm').then((module) => module.TaskForm));

interface FrameControls {
  /** Cierra sin preguntar. */
  close: () => void;
  /** Cierra, pero si hay cambios sin guardar pide confirmación. */
  requestClose: () => void;
  onDirtyChange: (dirty: boolean) => void;
}

function TaskSheetFrame({
  open,
  title,
  onClose,
  extraAction,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  /** Acción extra del encabezado: cierra la ventana (confirmando si hay cambios) y después se ejecuta. */
  extraAction?: { label: string; icon: ReactNode; run: () => void };
  children: (controls: FrameControls) => ReactNode;
}) {
  const [dirty, setDirty] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  // Qué hacer después de cerrar si se confirma descartar (por ejemplo, ir a la carpeta).
  const [afterDiscard, setAfterDiscard] = useState<(() => void) | null>(null);

  const close = (after?: (() => void) | null) => {
    setDirty(false);
    onClose();
    after?.();
  };
  const requestClose = (after?: () => void) => {
    if (dirty) {
      setAfterDiscard(() => after ?? null);
      setConfirmDiscard(true);
    } else {
      close(after);
    }
  };
  const onDirtyChange = useCallback((value: boolean) => setDirty(value), []);

  return (
    <>
      <Sheet
        open={open}
        onOpenChange={(next) => {
          if (!next) requestClose();
        }}
        title={title}
        size="tall"
        desktopWidth="md"
        dismissible={!dirty}
        customBody
        headerAction={
          <div className="-mt-2 -mr-2 flex items-center">
            {extraAction ? (
              <IconButton
                aria-label={extraAction.label}
                title={extraAction.label}
                onClick={() => requestClose(extraAction.run)}
              >
                {extraAction.icon}
              </IconButton>
            ) : null}
            <IconButton aria-label={es.tasks.closeForm} onClick={() => requestClose()}>
              <X />
            </IconButton>
          </div>
        }
      >
        <Suspense fallback={null}>
          {children({ close: () => close(), requestClose: () => requestClose(), onDirtyChange })}
        </Suspense>
      </Sheet>
      <ConfirmDialog
        open={confirmDiscard}
        onOpenChange={(next) => {
          setConfirmDiscard(next);
          if (!next) setAfterDiscard(null);
        }}
        title={es.tasks.discardTitle}
        description={es.tasks.discardDescription}
        confirmLabel={es.tasks.discard}
        onConfirm={() => {
          setConfirmDiscard(false);
          setAfterDiscard(null);
          close(afterDiscard);
        }}
      />
    </>
  );
}

// Montada una sola vez en AppShell; se abre desde "Nueva tarea" o el botón flotante.
export function CreateTaskSheet() {
  const request = useUiStore((state) => state.taskCreate);
  const open = useUiStore((state) => state.taskCreateOpen);
  const formKey = useUiStore((state) => state.taskCreateKey);
  const close = useUiStore((state) => state.closeTaskCreate);
  const today = useToday();

  return (
    <TaskSheetFrame open={open} title={es.tasks.newTask} onClose={close}>
      {(controls) =>
        request ? (
          <TaskForm
            key={formKey}
            mode={{ kind: 'create', folderId: request.folderId }}
            today={today}
            onClose={controls.close}
            onCancel={controls.requestClose}
            onDirtyChange={controls.onDirtyChange}
          />
        ) : null
      }
    </TaskSheetFrame>
  );
}

// Cada apertura recibe una clave nueva (el formulario arranca de cero) y se conserva
// la última tarea mientras la ventana se cierra, para la animación de salida.
function useOpenSession(taskId: string | null) {
  const [session, setSession] = useState({ taskId, key: 0, open: taskId !== null });
  if (taskId !== null && (!session.open || taskId !== session.taskId)) {
    setSession({ taskId, key: session.key + 1, open: true });
  } else if (taskId === null && session.open) {
    setSession({ ...session, open: false });
  }
  return session;
}

interface EditTaskSheetProps {
  taskId: string | null;
  onClose: () => void;
  onGoToFolder?: (folderId: string) => void;
}

// Se abre con la ruta /task/:id (desde la lista, el menú "Editar" o un link directo)
// o desde las vistas globales (Hoy, Buscar, filtros), que muestran "Ir a la carpeta".
// Hasta la primera apertura no se monta (sin consultas a la base).
export function EditTaskSheet(props: EditTaskSheetProps) {
  const session = useOpenSession(props.taskId);
  if (session.taskId === null) return null;
  return <EditTaskSheetContent {...props} session={session} />;
}

function EditTaskSheetContent({
  taskId,
  onClose,
  onGoToFolder,
  session,
}: EditTaskSheetProps & { session: ReturnType<typeof useOpenSession> }) {
  const result = useTask(session.taskId);
  const tagIds = useTaskTagIds(session.taskId);
  const links = useTaskLinks(session.taskId);
  const files = useTaskFiles(session.taskId);
  // Mientras la consulta se actualiza puede devolver la tarea anterior: se ignora.
  const task = result.task?.id === session.taskId ? result.task : null;
  // El formulario se arma una sola vez, con etiquetas, links y archivos ya cargados.
  const ready = task !== null && !tagIds.isLoading && !links.isLoading && !files.isLoading;
  const today = useToday();

  return (
    <TaskSheetFrame
      open={taskId !== null}
      title={es.tasks.editTask}
      onClose={onClose}
      extraAction={
        onGoToFolder && task
          ? {
              label: es.tasks.goToFolder,
              icon: <FolderOpen />,
              run: () => onGoToFolder(task.folderId),
            }
          : undefined
      }
    >
      {(controls) =>
        ready ? (
          <TaskForm
            key={session.key}
            mode={{
              kind: 'edit',
              task,
              tagIds: tagIds.tagIds,
              links: links.links,
              files: files.files,
            }}
            today={today}
            onClose={controls.close}
            onCancel={controls.requestClose}
            onDirtyChange={controls.onDirtyChange}
          />
        ) : result.isLoading || task !== null || !session.open ? null : (
          <SheetBody>
            <p className="py-12 text-center text-body text-muted">{es.tasks.notFound}</p>
          </SheetBody>
        )
      }
    </TaskSheetFrame>
  );
}
