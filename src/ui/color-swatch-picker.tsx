import { Ban } from 'lucide-react';
import { es } from '@/i18n/es';
import { cn } from '@/lib/cn';
import { COLOR_TOKENS, colorVar, type ColorToken } from '@/lib/colors';

// Selector de color: 10 tokens + "sin color". Círculo de 32px dentro de un área táctil de 48px.
export function ColorSwatchPicker({
  value,
  onChange,
  label,
}: {
  value: ColorToken | null;
  onChange: (value: ColorToken | null) => void;
  label: string;
}) {
  const swatchClass = (selected: boolean) =>
    cn(
      'flex size-8 items-center justify-center rounded-full transition-shadow duration-(--duration-fast)',
      selected && 'ring-2 ring-brand ring-offset-2 ring-offset-panel',
    );

  return (
    <div role="radiogroup" aria-label={label} className="-mx-2 flex flex-wrap">
      <button
        type="button"
        role="radio"
        aria-checked={value === null}
        aria-label={es.colors.none}
        title={es.colors.none}
        onClick={() => onChange(null)}
        className="flex size-12 items-center justify-center rounded-full"
      >
        <span className={cn(swatchClass(value === null), 'border border-line text-muted')}>
          <Ban className="size-4" />
        </span>
      </button>
      {COLOR_TOKENS.map((token) => (
        <button
          key={token}
          type="button"
          role="radio"
          aria-checked={value === token}
          aria-label={es.colors.names[token]}
          title={es.colors.names[token]}
          onClick={() => onChange(token)}
          className="flex size-12 items-center justify-center rounded-full"
        >
          <span
            className={swatchClass(value === token)}
            style={{ backgroundColor: colorVar(token) }}
          />
        </button>
      ))}
    </div>
  );
}

// Punto de color de 12px (carpetas, etiquetas).
export function ColorDot({ color, className }: { color: ColorToken | null; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-block size-3 shrink-0 rounded-full',
        !color && 'border border-muted',
        className,
      )}
      style={color ? { backgroundColor: colorVar(color) } : undefined}
    />
  );
}
