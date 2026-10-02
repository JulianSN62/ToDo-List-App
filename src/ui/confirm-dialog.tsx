import { es } from '@/i18n/es';
import { Button } from './button';
import { Sheet } from './sheet';

// Confirmación reservada para acciones destructivas de alto impacto (borrar carpeta, cerrar sesión).
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
  busy,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  busy?: boolean;
}) {
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      footer={
        <>
          <Button
            variant="secondary"
            className="flex-1 md:flex-none"
            onClick={() => onOpenChange(false)}
          >
            {es.common.cancel}
          </Button>
          <Button
            variant="danger"
            className="flex-1 md:flex-none"
            onClick={onConfirm}
            disabled={busy}
          >
            {confirmLabel}
          </Button>
        </>
      }
    />
  );
}
