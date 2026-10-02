import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { es } from '@/i18n/es';
import { cn } from '@/lib/cn';
import { IconButton } from './button';

// Encabezado de pantalla de 56px: botón volver opcional, título o breadcrumb y acciones.
export function ScreenHeader({
  onBack,
  children,
  actions,
  className,
}: {
  onBack?: () => void;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn('shrink-0 border-b border-line bg-app pt-safe', className)}>
      <div className="flex h-14 items-center gap-1 px-2 md:px-4">
        {onBack ? (
          <IconButton aria-label={es.common.back} onClick={onBack}>
            <ArrowLeft />
          </IconButton>
        ) : (
          <span className="w-2" aria-hidden />
        )}
        <div className="flex min-w-0 flex-1 items-center gap-2">{children}</div>
        {actions ? <div className="flex shrink-0 items-center gap-1">{actions}</div> : null}
      </div>
    </header>
  );
}

export function ScreenTitle({ children }: { children: ReactNode }) {
  return (
    <h1 className="truncate text-title-md font-semibold text-fg md:text-title-lg">{children}</h1>
  );
}
