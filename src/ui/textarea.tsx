import { useLayoutEffect, useRef, type ComponentProps } from 'react';
import { cn } from '@/lib/cn';

// Textarea que crece con el contenido (descripción de la tarea).
export function AutoTextarea({ className, value, ...props }: ComponentProps<'textarea'>) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    element.style.height = 'auto';
    element.style.height = `${element.scrollHeight}px`;
  }, [value]);

  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      className={cn(
        'min-h-12 w-full resize-none overflow-hidden rounded-sm border border-transparent bg-transparent px-3 py-3 text-body text-fg outline-none',
        'hover:border-line focus-visible:border-brand focus-visible:bg-panel focus-visible:outline-none',
        className,
      )}
      {...props}
    />
  );
}
