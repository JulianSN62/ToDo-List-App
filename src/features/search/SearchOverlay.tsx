import { useUiStore } from '@/app/uiStore';
import { es } from '@/i18n/es';
import { Sheet } from '@/ui/sheet';
import { SearchPanel } from './SearchPanel';

// Búsqueda como ventana centrada de 600px en desktop (design/screens/today-search.md),
// abierta con "/" o Ctrl+K. Mismo contenido que la pantalla Buscar. Una tarea se abre
// encima, y al cerrarla se vuelve a los resultados; "Ir a la carpeta" cierra todo.
export function SearchOverlay() {
  const open = useUiStore((state) => state.searchOverlayOpen);
  const setOpen = useUiStore((state) => state.setSearchOverlayOpen);

  return (
    <Sheet
      open={open}
      onOpenChange={setOpen}
      title={es.search.title}
      hideTitle
      desktopWidth="md"
      customBody
    >
      <div className="flex h-[min(70dvh,640px)] min-h-0 flex-col">
        <SearchPanel variant="overlay" onNavigate={() => setOpen(false)} />
      </div>
    </Sheet>
  );
}
