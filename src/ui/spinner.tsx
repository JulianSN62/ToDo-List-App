import { LoaderCircle } from 'lucide-react';
import { cn } from '@/lib/cn';

// Spinner inline de 16px (estados de carga de acciones con red, nunca para datos locales).
export function Spinner({ className }: { className?: string }) {
  return <LoaderCircle aria-hidden className={cn('size-4 animate-spin', className)} />;
}
