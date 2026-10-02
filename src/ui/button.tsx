import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/cn';

// Botón base (patrón shadcn/ui) con los tokens del diseño. Alto mínimo 48px (tap target).
export const buttonVariants = cva(
  'inline-flex shrink-0 items-center justify-center gap-2 rounded-sm font-medium whitespace-nowrap transition-[background-color,opacity,color] duration-(--duration-fast) ease-standard select-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary: 'bg-brand text-on-brand hover:opacity-90 active:opacity-80',
        secondary: 'border border-line bg-panel text-fg hover:bg-app active:bg-app',
        ghost: 'text-fg hover:bg-app active:bg-app',
        danger: 'bg-danger text-on-brand hover:opacity-90 active:opacity-80',
        dangerGhost: 'text-danger hover:bg-danger-soft active:bg-danger-soft',
        link: 'text-brand hover:underline',
      },
      size: {
        md: 'h-12 px-4 text-body [&_svg]:size-5',
        sm: 'h-10 px-3 text-body-sm [&_svg]:size-4',
        icon: 'size-12 rounded-full [&_svg]:size-6',
        iconSm: 'size-10 rounded-full [&_svg]:size-5',
      },
      block: {
        true: 'w-full',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
);

export type ButtonProps = ComponentProps<'button'> & VariantProps<typeof buttonVariants>;

export function Button({
  className,
  variant,
  size,
  block,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(buttonVariants({ variant, size, block }), className)}
      {...props}
    />
  );
}

// Botón de solo ícono: exige aria-label para accesibilidad.
export type IconButtonProps = Omit<ButtonProps, 'aria-label'> & { 'aria-label': string };

export function IconButton({
  variant = 'ghost',
  size = 'icon',
  className,
  ...props
}: IconButtonProps) {
  return (
    <Button
      variant={variant}
      size={size}
      className={cn('text-muted hover:text-fg', className)}
      {...props}
    />
  );
}
