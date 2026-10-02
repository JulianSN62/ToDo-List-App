import { formatDistanceToNow } from 'date-fns';
import { es as esLocale } from 'date-fns/locale';
import { Download } from 'lucide-react';
import { useEffect, useState } from 'react';
import { APP_NAME } from '@/config/app';
import { backupRepo } from '@/data';
import { es } from '@/i18n/es';
import { errorMeta, logger } from '@/lib/logger';
import { files } from '@/platform';
import { Button } from '@/ui/button';
import { showErrorToast, showToast } from '@/ui/toast';

// Exportar respaldo JSON (spec 7.8). Funciona sin conexión: lee la base local.
export function BackupSetting() {
  const [exporting, setExporting] = useState(false);
  const [lastExportedAt, setLastExportedAt] = useState<Date | null>(null);

  useEffect(() => {
    let active = true;
    backupRepo
      .getLastExportedAt()
      .then((date) => {
        if (active) setLastExportedAt(date);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  async function handleExport() {
    setExporting(true);
    try {
      const backup = await backupRepo.createExport();
      const result = await files.saveAndShare({
        name: backup.fileName,
        content: backup.content,
        mimeType: 'application/json',
        shareTitle: es.backup.shareTitle(APP_NAME),
      });
      if (result === 'canceled') return;
      const now = new Date();
      await backupRepo.markExported(now);
      setLastExportedAt(now);
      showToast(es.backup.exported(backup.fileName));
    } catch (error) {
      logger.warn('No se pudo exportar el respaldo', errorMeta(error));
      showErrorToast(es.backup.error);
    } finally {
      setExporting(false);
    }
  }

  const lastBackup = lastExportedAt
    ? es.backup.lastBackup(
        formatDistanceToNow(lastExportedAt, { addSuffix: true, locale: esLocale }),
      )
    : es.backup.neverBackedUp;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-body-sm text-muted">{es.backup.help}</p>
      <p className="text-body-sm text-muted">{lastBackup}</p>
      <div>
        <Button variant="secondary" onClick={() => void handleExport()} disabled={exporting}>
          <Download />
          {exporting ? es.backup.exporting : es.backup.export}
        </Button>
      </div>
    </div>
  );
}
