import { useEffect, useRef } from 'react';

// Imagen desde un archivo en memoria. La URL temporal (blob:) se crea al mostrarla y se
// libera al desmontar. Siempre con <img>: el navegador nunca ejecuta su contenido.
export function BlobImage({
  blob,
  alt,
  className,
}: {
  blob: Blob;
  alt: string;
  className?: string;
}) {
  const ref = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const image = ref.current;
    if (!image) return;
    const url = URL.createObjectURL(blob);
    image.src = url;
    return () => {
      image.removeAttribute('src');
      URL.revokeObjectURL(url);
    };
  }, [blob]);

  return <img ref={ref} alt={alt} decoding="async" draggable={false} className={className} />;
}
