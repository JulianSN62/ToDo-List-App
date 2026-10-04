import { Switch as SwitchPrimitive } from 'radix-ui';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/cn';

export function Switch({ className, ...props }: ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        // Apagado: pista en el gris de los controles, con contraste suficiente (WCAG 1.4.11).
        'relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border border-line-strong bg-line-strong transition-colors duration-(--duration-fast)',
        'disabled:opacity-50 data-[state=checked]:border-brand data-[state=checked]:bg-brand',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="block size-5 translate-x-1 rounded-full bg-panel elevation-sm transition-transform duration-(--duration-fast) data-[state=checked]:translate-x-6" />
    </SwitchPrimitive.Root>
  );
}
