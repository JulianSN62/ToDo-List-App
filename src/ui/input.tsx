import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/cn';

// Campo de texto de 48px con ícono opcional a la izquierda.
export type InputProps = ComponentProps<'input'> & {
  icon?: ReactNode;
  invalid?: boolean;
};

export function Input({ className, icon, invalid, ...props }: InputProps) {
  return (
    <div className="relative w-full">
      {icon ? (
        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted [&_svg]:size-5">
          {icon}
        </span>
      ) : null}
      <input
        aria-invalid={invalid || undefined}
        className={cn(
          'h-12 w-full rounded-sm border border-line-strong bg-panel px-3 text-body text-fg transition-colors duration-(--duration-fast) outline-none',
          'focus-visible:border-brand focus-visible:ring-1 focus-visible:ring-brand focus-visible:outline-none',
          'disabled:opacity-50',
          icon ? 'pl-10' : undefined,
          invalid ? 'border-danger' : undefined,
          className,
        )}
        {...props}
      />
    </div>
  );
}
