import { Check } from 'lucide-react';
import { Checkbox as CheckboxPrimitive } from 'radix-ui';
import { useId, type ComponentProps } from 'react';
import { cn } from '@/lib/cn';

export function Checkbox({ className, ...props }: ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      className={cn(
        'flex size-5 shrink-0 items-center justify-center rounded-[4px] border-2 border-muted transition-colors duration-(--duration-fast)',
        'disabled:opacity-50 data-[state=checked]:border-brand data-[state=checked]:bg-brand',
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="text-on-brand">
        <Check className="size-3.5" strokeWidth={3} aria-hidden />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

// Opción de 48px de alto con su etiqueta (toda la fila es tocable), como RadioOption.
export function CheckboxRow({
  label,
  disabled,
  className,
  ...props
}: ComponentProps<typeof CheckboxPrimitive.Root> & { label: string }) {
  const id = useId();
  return (
    <label
      htmlFor={id}
      className={cn(
        'flex h-12 items-center gap-3 rounded-sm px-2',
        disabled ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-app',
        className,
      )}
    >
      <Checkbox id={id} disabled={disabled} {...props} />
      <span className={cn('text-body text-fg', disabled && 'opacity-50')}>{label}</span>
    </label>
  );
}
