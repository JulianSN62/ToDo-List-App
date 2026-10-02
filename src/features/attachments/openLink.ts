import type { MouseEvent } from 'react';
import { es } from '@/i18n/es';
import { errorMeta, logger } from '@/lib/logger';
import { externalLinks } from '@/platform';
import { showErrorToast } from '@/ui/toast';

// Abre un link fuera de la app (pestaña nueva en web, navegador del sistema en Android).
export function openExternalLink(event: MouseEvent<HTMLAnchorElement>, url: string): void {
  event.preventDefault();
  void externalLinks.open(url).catch((error: unknown) => {
    logger.error('No se pudo abrir el link', errorMeta(error));
    showErrorToast(es.links.openError);
  });
}
