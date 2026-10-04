import { toast, Toaster as SonnerToaster } from 'sonner';
import { es } from '@/i18n/es';
import { useIsSidebarLayout } from './useMediaQuery';

// Avisos breves. El de "Deshacer" dura unos 6 segundos.
export const UNDO_DURATION_MS = 6000;

// Último aviso con "Deshacer" que sigue visible (lo usa el atajo Ctrl+Z).
let lastUndo: { id: string | number; undo: () => void } | null = null;

function forgetUndo(id: string | number) {
  if (lastUndo?.id === id) lastUndo = null;
}

export function showUndoToast(message: string, onUndo: () => void): void {
  const id = toast(message, {
    duration: UNDO_DURATION_MS,
    action: {
      label: es.common.undo,
      onClick: () => {
        forgetUndo(id);
        onUndo();
      },
    },
    onDismiss: () => forgetUndo(id),
    onAutoClose: () => forgetUndo(id),
  });
  lastUndo = { id, undo: onUndo };
}

/** Deshace la última acción cuyo aviso con "Deshacer" sigue visible. false si no hay ninguna. */
export function undoLastAction(): boolean {
  if (!lastUndo) return false;
  const { id, undo } = lastUndo;
  lastUndo = null;
  toast.dismiss(id);
  undo();
  return true;
}

export function showToast(message: string): void {
  toast(message);
}

export function showErrorToast(message: string = es.errors.generic): void {
  toast.error(message);
}

// Aviso que queda visible hasta que se usa la acción o se descarta (ej.: nueva versión de la PWA).
export function showPersistentActionToast(
  message: string,
  actionLabel: string,
  onAction: () => void,
  onDismiss?: () => void,
): string | number {
  return toast(message, {
    duration: Number.POSITIVE_INFINITY,
    action: { label: actionLabel, onClick: onAction },
    onDismiss,
  });
}

export function dismissToast(id: string | number): void {
  toast.dismiss(id);
}

// En mobile queda por encima de la barra inferior y del botón "+" (56px), para no taparlo.
// Sonner usa mobileOffset solo hasta 600px y la app usa el diseño mobile hasta 767px:
// en ese tramo se aplica el mismo valor con offset.
const MOBILE_OFFSET = {
  bottom: 'calc(64px + 16px + 56px + 8px + env(safe-area-inset-bottom, 0px))',
};

export function Toaster() {
  const isSidebarLayout = useIsSidebarLayout();
  return (
    <SonnerToaster
      position={isSidebarLayout ? 'bottom-left' : 'bottom-center'}
      containerAriaLabel={es.toasts.region}
      offset={isSidebarLayout ? undefined : MOBILE_OFFSET}
      mobileOffset={MOBILE_OFFSET}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            'flex min-h-12 w-full items-center gap-3 rounded-sm border border-line bg-panel px-4 py-2 text-body-sm text-fg elevation-md',
          title: 'flex-1',
          actionButton:
            'h-10 shrink-0 rounded-sm px-3 text-body-sm font-semibold text-brand hover:bg-app',
          error: 'text-danger',
        },
      }}
    />
  );
}
