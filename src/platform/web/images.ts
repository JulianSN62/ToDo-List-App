import { fitWithin } from '@/lib/files';
import type { ImageService } from '../types';

// Navegador: se decodifica la imagen, se achica en un canvas y se vuelve a codificar.
// Al re-codificarla se pierden los metadatos (por ejemplo, la ubicación de la foto).

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('No se pudo codificar la imagen'))),
      type,
      quality,
    );
  });
}

export const webImages: ImageService = {
  async compress(data, { outputType, quality, maxSide }) {
    let bitmap: ImageBitmap;
    try {
      bitmap = await createImageBitmap(data, { imageOrientation: 'from-image' });
    } catch {
      return null;
    }
    try {
      const size = fitWithin(bitmap.width, bitmap.height, maxSide);
      const canvas = document.createElement('canvas');
      canvas.width = size.width;
      canvas.height = size.height;
      const context = canvas.getContext('2d');
      if (!context) return null;
      // JPEG no tiene transparencia: fondo blanco en vez de negro.
      if (outputType === 'image/jpeg') {
        context.fillStyle = 'white';
        context.fillRect(0, 0, size.width, size.height);
      }
      context.drawImage(bitmap, 0, 0, size.width, size.height);
      // Si el navegador no sabe generar el tipo pedido, devuelve PNG (blob.type lo indica).
      const blob = await canvasToBlob(canvas, outputType, quality);
      return { data: blob, width: size.width, height: size.height };
    } finally {
      bitmap.close();
    }
  },
};
