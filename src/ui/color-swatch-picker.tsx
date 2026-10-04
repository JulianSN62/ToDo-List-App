import { Ban } from 'lucide-react';
import { RadioGroup as RadioGroupPrimitive } from 'radix-ui';
import { es } from '@/i18n/es';
import { cn } from '@/lib/cn';
import { COLOR_TOKENS, colorVar, type ColorToken } from '@/lib/colors';

// Selector de color: 10 tokens + "sin color". Círculo de 32px dentro de un área táctil de 48px.
// Es un grupo de opciones (Radix): un solo Tab entra al grupo y las flechas cambian el color.
const NONE = 'none';

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
  const itemClass = 'flex size-12 items-center justify-center rounded-full';

  return (
    <RadioGroupPrimitive.Root
      aria-label={label}
      value={value ?? NONE}
      onValueChange={(next) => onChange(next === NONE ? null : (next as ColorToken))}
      loop
      className="-mx-2 flex flex-wrap"
    >
      <RadioGroupPrimitive.Item
        value={NONE}
        aria-label={es.colors.none}
        title={es.colors.none}
        className={itemClass}
      >
        <span className={cn(swatchClass(value === null), 'border border-line-strong text-muted')}>
          <Ban aria-hidden className="size-4" />
        </span>
      </RadioGroupPrimitive.Item>
      {COLOR_TOKENS.map((token) => (
        <RadioGroupPrimitive.Item
          key={token}
          value={token}
          aria-label={es.colors.names[token]}
          title={es.colors.names[token]}
          className={itemClass}
        >
          <span
            className={swatchClass(value === token)}
            style={{ backgroundColor: colorVar(token) }}
          />
        </RadioGroupPrimitive.Item>
      ))}
    </RadioGroupPrimitive.Root>
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
