import type { BinaryFile, FileService, PickedFile } from '../types';

// Navegador: descargas con un link temporal a un Blob y selector con <input type="file">.

// Tiempo que se mantiene vivo el Blob de un PDF abierto en otra pestaña.
const PDF_URL_LIFETIME_MS = 10 * 60 * 1000;

function downloadBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  try {
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.rel = 'noopener';
    document.body.append(link);
    link.click();
    link.remove();
  } finally {
    // Se libera después de que el navegador tomó la descarga.
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

function toPicked(file: File): PickedFile {
  return { name: file.name, mimeType: file.type, size: file.size, data: file };
}

// Se descarga con un tipo genérico: así el navegador nunca interpreta el contenido
// (un HTML adjunto, por ejemplo, no se ejecuta con el origen de la app).
function saveBinary(file: BinaryFile): void {
  downloadBlob(new Blob([file.data], { type: 'application/octet-stream' }), file.name);
}

export const webFiles: FileService = {
  async saveAndShare(file) {
    downloadBlob(new Blob([file.content], { type: file.mimeType }), file.name);
    return 'saved';
  },

  // Las descargas quedan en la carpeta del usuario: la app no guarda copias propias.
  async clearShared() {},

  pickFiles({ multiple = true, accept } = {}) {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = multiple;
      if (accept) input.accept = accept;
      input.hidden = true;
      const finish = (files: PickedFile[]) => {
        input.remove();
        resolve(files);
      };
      input.addEventListener('change', () => finish([...(input.files ?? [])].map(toPicked)), {
        once: true,
      });
      input.addEventListener('cancel', () => finish([]), { once: true });
      document.body.append(input);
      input.click();
    });
  },

  async saveFile(file) {
    saveBinary(file);
    return 'saved';
  },

  async openPdf(file) {
    const url = URL.createObjectURL(new Blob([file.data], { type: 'application/pdf' }));
    const opened = window.open(url, '_blank');
    if (!opened) {
      URL.revokeObjectURL(url);
      saveBinary(file);
      return;
    }
    window.setTimeout(() => URL.revokeObjectURL(url), PDF_URL_LIFETIME_MS);
  },
};
