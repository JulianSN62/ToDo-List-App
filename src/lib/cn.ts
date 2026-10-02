import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

// tailwind-merge debe conocer los tamaños de texto del diseño (text-body, text-caption...);
// si no, los confunde con colores y descarta clases como text-danger.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ text: ['caption', 'body-sm', 'body', 'title-sm', 'title-md', 'title-lg'] }],
    },
  },
});

// Combina clases de Tailwind resolviendo conflictos (patrón de shadcn/ui).
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
