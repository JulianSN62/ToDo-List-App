import { HardDrive, Paperclip } from 'lucide-react';
import { useState } from 'react';
import { STORAGE_PLAN_BYTES } from '@/config/app';
import { fileRepo, useFileStorageUsage } from '@/data';
import { es } from '@/i18n/es';
import { formatFileSize } from '@/lib/files';
import { errorMeta, logger } from '@/lib/logger';
import { Button } from '@/ui/button';
import { ConfirmDialog } from '@/ui/confirm-dialog';
import { showErrorToast, showToast } from '@/ui/toast';

// Ajustes → Datos: cuánto ocupan los archivos adjuntos en la nube y en este dispositivo,
// y "Liberar espacio" (borra del dispositivo solo los que ya están en la nube).
export function FilesStorageSetting() {
  const usage = useFileStorageUsage();
  const [confirming, setConfirming] = useState(false);
  const [freeing, setFreeing] = useState(false);

  async function handleFree() {
    setFreeing(true);
    try {
      await fileRepo.freeDeviceSpace();
      showToast(es.files.storage.freed);
    } catch (error) {
      logger.warn('No se pudo liberar espacio', errorMeta(error));
      showErrorToast();
    } finally {
      setFreeing(false);
      setConfirming(false);
    }
  }

  return (
    <div className="mt-4 flex flex-col gap-2">
      <h3 className="flex items-center gap-2 text-body font-medium text-fg [&_svg]:size-5 [&_svg]:text-muted">
        <Paperclip aria-hidden />
        {es.files.storage.title}
      </h3>
      <p className="text-body-sm text-muted">
        {es.files.storage.cloud(
          formatFileSize(usage.cloudBytes),
          formatFileSize(STORAGE_PLAN_BYTES),
        )}
      </p>
      <p className="text-body-sm text-muted">
        {es.files.storage.device(formatFileSize(usage.deviceBytes))}
      </p>
      <p className="text-body-sm text-muted">{es.files.storage.help}</p>
      <div>
        <Button
          variant="secondary"
          disabled={usage.freeableBytes === 0 || freeing}
          onClick={() => setConfirming(true)}
        >
          <HardDrive />
          {es.files.storage.free}
        </Button>
      </div>

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={es.files.storage.freeTitle}
        description={es.files.storage.freeDescription(formatFileSize(usage.freeableBytes))}
        confirmLabel={es.files.storage.free}
        onConfirm={() => void handleFree()}
        busy={freeing}
      />
    </div>
  );
}
