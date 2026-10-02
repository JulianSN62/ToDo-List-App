import { useEffect, useState } from 'react';
import { fileRepo } from '@/data';

// Archivo guardado en el dispositivo (null mientras se lee o si no está).
// Se vuelve a leer cuando "enabled" pasa a true (por ejemplo, al terminar una descarga).
export function useStoredFile(id: string | null, enabled: boolean): Blob | null {
  const [state, setState] = useState<{ id: string; blob: Blob } | null>(null);

  useEffect(() => {
    if (!id || !enabled) return;
    let cancelled = false;
    void fileRepo.readLocal(id).then((blob) => {
      if (!cancelled && blob) setState({ id, blob });
    });
    return () => {
      cancelled = true;
    };
  }, [id, enabled]);

  return enabled && state?.id === id ? state.blob : null;
}
