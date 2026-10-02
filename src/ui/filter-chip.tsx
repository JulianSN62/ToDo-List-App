import type { ComponentProps } from 'react';
import { cn } from '@/lib/cn';

// Chip de filtro: inactivo con borde y texto secundario; activo en el color de acento.
// Se ve de 32px de alto, con área táctil de 48px.
export function FilterChip({
  active,
  className,
  type = 'button',
  ...props
}: ComponentProps<'button'> & { active: boolean }) {
  return (
    <button
      type={type}
      className={cn(
        'relative inline-flex h-8 max-w-full min-w-0 shrink-0 items-center gap-1.5 rounded-full border px-3 text-body-sm whitespace-nowrap transition-colors duration-(--duration-fast) after:absolute after:inset-x-0 after:-inset-y-2 [&_svg]:size-4 [&_svg]:shrink-0',
        active
          ? 'border-brand/30 bg-brand/12 text-brand'
          : 'border-line bg-panel text-muted hover:text-fg',
        className,
      )}
      {...props}
    />
  );
}
