import type { ExternalLinkService } from '../types';

// Navegador: el link se abre en una pestaña nueva, sin acceso a esta ventana.
export const webLinks: ExternalLinkService = {
  async open(url) {
    window.open(url, '_blank', 'noopener,noreferrer');
  },
};
