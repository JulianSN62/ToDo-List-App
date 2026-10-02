import { PowerSyncContext } from '@powersync/react';
import { useMemo, type ReactNode } from 'react';
import { getDb } from './db';

// Expone la base local a los hooks de lectura reactiva.
export function DataProvider({ children }: { children: ReactNode }) {
  const db = useMemo(() => getDb(), []);
  return <PowerSyncContext.Provider value={db}>{children}</PowerSyncContext.Provider>;
}
