import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/cn';

// Teclado en pantalla abierto: el viewport visual se achica bastante.
function useKeyboardOpen(): boolean {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const onResize = () => setOpen(window.innerHeight - viewport.height > 150);
    viewport.addEventListener('resize', onResize);
    return () => viewport.removeEventListener('resize', onResize);
  }, []);
  return open;
}

// Botón flotante (+), solo en mobile. Se oculta con el teclado abierto.
export function Fab({ label, onClick }: { label: string; onClick: () => void }) {
  const keyboardOpen = useKeyboardOpen();
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        'fixed right-4 z-30 flex size-14 items-center justify-center rounded-full bg-brand text-on-brand elevation-md transition-transform duration-(--duration-fast) active:scale-95',
        'bottom-[calc(64px+16px+env(safe-area-inset-bottom,0px))]',
        keyboardOpen && 'hidden',
      )}
    >
      <Plus aria-hidden className="size-6" />
    </button>
  );
}
