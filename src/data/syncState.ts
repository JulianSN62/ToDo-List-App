import { usePowerSync, useStatus } from '@powersync/react';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { SYNCED_TABLES } from './schema';

// Estado de sincronización para la UI: Sincronizado / Sincronizando / Sin conexión / Error.

export type SyncKind = 'synced' | 'syncing' | 'offline' | 'error';

export interface SyncState {
  kind: SyncKind;
  pending: number;
  lastSyncedAt: Date | null;
}

function subscribeOnline(callback: () => void): () => void {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}

export function useOnline(): boolean {
  return useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true,
  );
}

// Cantidad de cambios locales que todavía no se subieron.
function usePendingCount(): number {
  const db = usePowerSync();
  const status = useStatus();
  const [pending, setPending] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const refresh = () => {
      db.getUploadQueueStats()
        .then((stats) => {
          if (!cancelled) setPending(stats.count);
        })
        .catch(() => undefined);
    };
    refresh();
    const unsubscribe = db.onChange(
      { onChange: refresh },
      { tables: [...SYNCED_TABLES], throttleMs: 300 },
    );
    return () => {
      cancelled = true;
      unsubscribe();
    };
    // El estado cambia al terminar cada subida: se vuelve a contar.
  }, [db, status]);

  return pending;
}

// true cuando ya se completó al menos una sincronización completa en este dispositivo.
export function useHasSynced(): boolean {
  return useStatus().hasSynced === true;
}

export function useSyncState(): SyncState {
  const status = useStatus();
  const online = useOnline();
  const pending = usePendingCount();
  const flow = status.dataFlowStatus;

  let kind: SyncKind;
  if (!online) kind = 'offline';
  else if (flow.uploadError || flow.downloadError) kind = 'error';
  else if (status.connecting || flow.uploading || flow.downloading) kind = 'syncing';
  else if (status.connected) kind = pending > 0 ? 'syncing' : 'synced';
  else kind = 'offline';

  return { kind, pending, lastSyncedAt: status.lastSyncedAt ?? null };
}
