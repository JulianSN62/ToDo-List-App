import { X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { colorTint, colorVar, type ColorToken } from '@/lib/colors';

// Chip de etiqueta: fondo del color al 12%, punto de color y texto en el color principal
// (así el texto cumple contraste AA con cualquier color y en ambos temas).
type TagChipProps = {
  name: string;
  color: ColorToken | null;
  size?: 'sm' | 'md';
  className?: string;
} & (
  | { onRemove?: undefined; removeLabel?: undefined }
  /** El chip muestra un botón para quitarlo, siempre con su nombre accesible. */
  | { onRemove: () => void; removeLabel: string }
);

export function TagChip({
  name,
  color,
  size = 'md',
  onRemove,
  removeLabel,
  className,
}: TagChipProps) {
  return (
    <span
      className={cn(
        'inline-flex max-w-full min-w-0 shrink-0 items-center gap-1.5 rounded-full text-fg',
        size === 'sm' ? 'h-6 px-2 text-caption' : 'h-7 px-3 text-body-sm',
        !color && 'border border-line bg-panel',
        onRemove && 'pr-1',
        className,
      )}
      style={color ? { backgroundColor: colorTint(color) } : undefined}
    >
      <span
        aria-hidden
        className={cn('size-2 shrink-0 rounded-full', !color && 'border border-muted')}
        style={color ? { backgroundColor: colorVar(color) } : undefined}
      />
      <span className="min-w-0 truncate">{name}</span>
      {onRemove ? (
        <button
          type="button"
          aria-label={removeLabel}
          onClick={onRemove}
          // Área táctil ampliada más allá del ícono visible.
          className="relative flex size-6 shrink-0 items-center justify-center rounded-full text-muted after:absolute after:-inset-3 hover:text-fg"
        >
          <X aria-hidden className="size-3.5" />
        </button>
      ) : null}
    </span>
  );
}
