import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

// Estado vacío: ícono + texto guía. Nunca un estado vacío sin indicación de qué hacer.
export function EmptyState({
  icon,
  title,
  hint,
  className,
  children,
}: {
  icon: ReactNode;
  title: string;
  hint?: string;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div
      className={cn(
        'flex flex-1 flex-col items-center justify-center gap-2 px-6 py-12 text-center',
        className,
      )}
    >
      <span aria-hidden className="mb-2 text-muted [&_svg]:size-10 [&_svg]:stroke-[1.5]">
        {icon}
      </span>
      <p className="text-body text-muted">{title}</p>
      {hint ? <p className="text-body text-muted">{hint}</p> : null}
      {children}
    </div>
  );
}
