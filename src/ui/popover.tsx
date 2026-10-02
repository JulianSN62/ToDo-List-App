import { Popover as PopoverPrimitive } from 'radix-ui';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

// Globo anclado a un botón (Radix Popover). Se cierra con Esc o tocando afuera.
export function Popover({
  trigger,
  children,
  className,
  align = 'end',
  label,
}: {
  /** Debe ser un único elemento que acepte ref (por ejemplo, IconButton). */
  trigger: ReactNode;
  children: ReactNode;
  className?: string;
  align?: 'start' | 'center' | 'end';
  /** Nombre accesible del contenido. */
  label: string;
}) {
  return (
    <PopoverPrimitive.Root>
      <PopoverPrimitive.Trigger asChild>{trigger}</PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align={align}
          sideOffset={6}
          aria-label={label}
          className={cn(
            'z-50 rounded-md border border-line bg-panel p-4 elevation-md outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0',
            className,
          )}
        >
          {children}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
