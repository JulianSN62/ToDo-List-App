import { CircleAlert, CircleCheck, CloudOff, LoaderCircle } from 'lucide-react';
import { useSyncState, type SyncState } from '@/data';
import { cn } from '@/lib/cn';
import { syncLabel } from './syncLabel';

// Indicador discreto de sincronización. Nunca bloquea la interfaz.

export function SyncIcon({ state, className }: { state: SyncState; className?: string }) {
  switch (state.kind) {
    case 'synced':
      return <CircleCheck aria-hidden className={className} />;
    case 'syncing':
      return <LoaderCircle aria-hidden className={cn(className, 'animate-spin')} />;
    case 'offline':
      return <CloudOff aria-hidden className={className} />;
    case 'error':
      return <CircleAlert aria-hidden className={className} />;
  }
}

const toneClass: Record<SyncState['kind'], string> = {
  synced: 'text-muted',
  syncing: 'text-brand',
  offline: 'text-muted',
  error: 'text-danger',
};

// variant "compact": solo el ícono (header mobile); "full": ícono + texto.
export function SyncIndicator({
  variant = 'full',
  className,
}: {
  variant?: 'compact' | 'full';
  className?: string;
}) {
  const state = useSyncState();
  const label = syncLabel(state);
  return (
    <span
      role="status"
      aria-live="polite"
      title={label}
      className={cn(
        'inline-flex items-center gap-1.5 text-caption',
        toneClass[state.kind],
        className,
      )}
    >
      <SyncIcon state={state} className="size-4 shrink-0" />
      <span className={variant === 'compact' ? 'sr-only' : 'truncate'}>{label}</span>
    </span>
  );
}
