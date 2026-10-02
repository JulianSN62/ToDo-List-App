import type { ComponentProps } from 'react';
import { cn } from '@/lib/cn';

// Tecla de un atajo (design/components.md): chip chico con borde y letra monoespaciada.
export function Kbd({ className, ...props }: ComponentProps<'kbd'>) {
  return (
    <kbd
      className={cn(
        'inline-flex h-6 min-w-6 items-center justify-center rounded-sm border border-line bg-app px-1.5 font-mono text-caption text-fg',
        className,
      )}
      {...props}
    />
  );
}
