import { Folder as FolderIcon, House, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useFolderTree } from '@/data';
import { es } from '@/i18n/es';
import { cn } from '@/lib/cn';
import { matchesSearch } from '@/lib/text';
import { flattenTree, getPath } from '@/lib/tree';
import { Button } from '@/ui/button';
import { ColorDot } from '@/ui/color-swatch-picker';
import { Input } from '@/ui/input';
import { Sheet } from '@/ui/sheet';

// Selector de carpeta destino en forma de árbol, con búsqueda.
// Se usa para "Mover carpeta", "Mover tarea" y elegir la carpeta en el formulario de tarea.

const ROOT = '__root__';

export function FolderPickerSheet({
  open,
  onOpenChange,
  title,
  allowRoot,
  disabledIds,
  currentId,
  onConfirm,
  confirmLabel = es.common.move,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** Las carpetas pueden ir a la raíz; las tareas no. */
  allowRoot: boolean;
  /** Destinos inválidos (la carpeta misma y sus descendientes). */
  disabledIds: ReadonlySet<string>;
  /** Ubicación actual (se marca como "actual"). null = raíz. */
  currentId: string | null;
  onConfirm: (targetId: string | null) => void;
  /** Texto del botón de confirmar ("Mover" por defecto). */
  confirmLabel?: string;
}) {
  const { children, byId } = useFolderTree();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string | null>(null);

  const items = useMemo(() => flattenTree(children), [children]);
  const filtered = useMemo(() => {
    if (!query.trim()) return items;
    return items.filter(({ node }) => matchesSearch(node.name, query));
  }, [items, query]);

  const currentKey = currentId ?? ROOT;
  const canConfirm = selected !== null && selected !== currentKey;

  function handleOpenChange(next: boolean) {
    if (!next) {
      setQuery('');
      setSelected(null);
    }
    onOpenChange(next);
  }

  const rowClass = (key: string, disabled: boolean) =>
    cn(
      'flex h-11 w-full items-center gap-2 rounded-sm px-2 text-left text-body-sm',
      disabled ? 'cursor-not-allowed text-muted opacity-60' : 'text-fg hover:bg-app',
      selected === key && 'bg-brand/10 text-brand',
    );

  return (
    <Sheet
      open={open}
      onOpenChange={handleOpenChange}
      title={title}
      size="tall"
      desktopWidth="md"
      footer={
        <>
          <Button
            variant="secondary"
            className="flex-1 md:flex-none"
            onClick={() => handleOpenChange(false)}
          >
            {es.common.cancel}
          </Button>
          <Button
            className="flex-1 md:flex-none"
            disabled={!canConfirm}
            onClick={() => {
              if (!canConfirm) return;
              onConfirm(selected === ROOT ? null : selected);
              handleOpenChange(false);
            }}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <Input
          type="search"
          icon={<Search />}
          placeholder={es.folders.searchFolder}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label={es.folders.searchFolder}
        />
        <ul role="listbox" aria-label={title} className="flex flex-col">
          {allowRoot && !query.trim() ? (
            <li>
              <button
                type="button"
                role="option"
                aria-selected={selected === ROOT}
                disabled={currentKey === ROOT}
                className={rowClass(ROOT, currentKey === ROOT)}
                onClick={() => setSelected(ROOT)}
              >
                <House aria-hidden className="size-5 shrink-0 text-muted" />
                <span className="truncate">{es.common.root}</span>
                {currentKey === ROOT ? (
                  <span className="ml-auto text-caption">{es.folders.current}</span>
                ) : null}
              </button>
            </li>
          ) : null}
          {filtered.map(({ node, depth }) => {
            const disabled = disabledIds.has(node.id);
            const isCurrent = node.id === currentId;
            const pathLabel = query.trim()
              ? getPath(node.id, byId)
                  .slice(0, -1)
                  .map((folder) => folder.name)
                  .join(' › ')
              : '';
            return (
              <li key={node.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected === node.id}
                  aria-disabled={disabled || isCurrent}
                  disabled={disabled || isCurrent}
                  className={rowClass(node.id, disabled || isCurrent)}
                  style={{
                    paddingLeft: query.trim()
                      ? undefined
                      : `${8 + (depth + (allowRoot ? 1 : 0)) * 16}px`,
                  }}
                  onClick={() => setSelected(node.id)}
                >
                  {node.color ? (
                    <ColorDot color={node.color} />
                  ) : (
                    <FolderIcon aria-hidden className="size-5 shrink-0 text-muted" />
                  )}
                  <span className="min-w-0 truncate">
                    {node.name}
                    {pathLabel ? (
                      <span className="block truncate text-caption text-muted">{pathLabel}</span>
                    ) : null}
                  </span>
                  {isCurrent ? (
                    <span className="ml-auto shrink-0 text-caption">{es.folders.current}</span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </Sheet>
  );
}
