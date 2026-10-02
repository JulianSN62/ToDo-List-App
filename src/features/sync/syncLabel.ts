import type { SyncState } from '@/data';
import { es } from '@/i18n/es';

// Texto del estado de sincronización.
export function syncLabel(state: SyncState): string {
  switch (state.kind) {
    case 'synced':
      return es.sync.synced;
    case 'syncing':
      return es.sync.syncing;
    case 'offline':
      return es.sync.offline(state.pending);
    case 'error':
      return es.sync.error;
  }
}
