import { PowerSyncContext } from '@powersync/react';
import { useEffect, useState, type ReactNode } from 'react';
import { errorMeta, logger } from '@/lib/logger';
import { getDb } from './db';

// Expone la base local a los hooks de lectura reactiva. Si no se puede abrir (ventana
// privada, almacenamiento bloqueado o lleno), muestra "errorFallback" en lugar de una
// app vacía en la que nada se guarda.
export function DataProvider({
  children,
  errorFallback,
}: {
  children: ReactNode;
  errorFallback: ReactNode;
}) {
  const [db] = useState(() => {
    try {
      return getDb();
    } catch (error) {
      logger.error('No se pudo crear la base local', errorMeta(error));
      return null;
    }
  });
  const [failed, setFailed] = useState(db === null);

  useEffect(() => {
    if (!db) return;
    let cancelled = false;
    db.init().catch((error: unknown) => {
      logger.error('No se pudo abrir la base local', errorMeta(error));
      if (!cancelled) setFailed(true);
    });
    return () => {
      cancelled = true;
    };
  }, [db]);

  if (!db || failed) return errorFallback;
  return <PowerSyncContext.Provider value={db}>{children}</PowerSyncContext.Provider>;
}
