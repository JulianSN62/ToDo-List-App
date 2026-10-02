import type { FileService } from '../types';

// Navegador: el archivo se descarga con un link temporal a un Blob.
export const webFiles: FileService = {
  async saveAndShare(file) {
    const blob = new Blob([file.content], { type: file.mimeType });
    const url = URL.createObjectURL(blob);
    try {
      const link = document.createElement('a');
      link.href = url;
      link.download = file.name;
      link.rel = 'noopener';
      document.body.append(link);
      link.click();
      link.remove();
    } finally {
      // Se libera después de que el navegador tomó la descarga.
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    return 'saved';
  },
};
