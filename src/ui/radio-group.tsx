import { RadioGroup as RadioGroupPrimitive } from 'radix-ui';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/cn';

export function RadioGroup({
  className,
  ...props
}: ComponentProps<typeof RadioGroupPrimitive.Root>) {
  return <RadioGroupPrimitive.Root className={cn('flex flex-col', className)} {...props} />;
}

// Opción de 48px de alto con su etiqueta (toda la fila es tocable).
export function RadioOption({ value, label }: { value: string; label: string }) {
  const id = `radio-${value}`;
  return (
    <label
      htmlFor={id}
      className="flex h-12 cursor-pointer items-center gap-3 rounded-sm px-2 hover:bg-app"
    >
      <RadioGroupPrimitive.Item
        id={id}
        value={value}
        className="flex size-5 items-center justify-center rounded-full border-2 border-muted data-[state=checked]:border-brand"
      >
        <RadioGroupPrimitive.Indicator className="block size-2.5 rounded-full bg-brand" />
      </RadioGroupPrimitive.Item>
      <span className="text-body text-fg">{label}</span>
    </label>
  );
}
