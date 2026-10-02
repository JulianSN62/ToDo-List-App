import { Download } from 'lucide-react';
import { es } from '@/i18n/es';
import { errorMeta, logger } from '@/lib/logger';
import { files } from '@/platform';
import { Button } from '@/ui/button';
import { Sheet } from '@/ui/sheet';
import { showErrorToast } from '@/ui/toast';
import { BlobImage } from './BlobImage';

export interface ViewedImage {
  name: string;
  mimeType: string;
  data: Blob;
}

// Foto adjunta en grande, dentro de la app, con un botón para descargarla.
// La imagen se conserva mientras la ventana se cierra (animación de salida).
export function ImageViewer({
  open,
  image,
  onClose,
}: {
  open: boolean;
  image: ViewedImage | null;
  onClose: () => void;
}) {
  async function download() {
    if (!image) return;
    try {
      await files.saveFile(image);
    } catch (error) {
      logger.warn('No se pudo descargar la imagen', errorMeta(error));
      showErrorToast(es.files.openError);
    }
  }

  return (
    <Sheet
      open={open && image !== null}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={image?.name ?? ''}
      desktopWidth="md"
      footer={
        <>
          <Button variant="secondary" className="flex-1 md:flex-none" onClick={onClose}>
            {es.common.close}
          </Button>
          <Button className="flex-1 md:flex-none" onClick={() => void download()}>
            <Download />
            {es.files.download}
          </Button>
        </>
      }
    >
      {image ? (
        <div className="flex justify-center">
          <BlobImage
            blob={image.data}
            alt={es.files.viewerAlt(image.name)}
            className="max-h-[60dvh] w-auto max-w-full rounded-sm object-contain"
          />
        </div>
      ) : null}
    </Sheet>
  );
}
