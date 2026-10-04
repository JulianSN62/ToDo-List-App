import { ChevronRight, Folder as FolderIcon, House, Search } from 'lucide-react';
import { useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useFolderTree, type Folder } from '@/data';
import { es } from '@/i18n/es';
import { cn } from '@/lib/cn';
import { matchesSearch } from '@/lib/text';
import {
  ancestorIds,
  flattenTree,
  getPath,
  treeKeyAction,
  visibleTreeItems,
  type TreeKeyRow,
} from '@/lib/tree';
import { Button } from '@/ui/button';
import { ColorDot } from '@/ui/color-swatch-picker';
import { Input } from '@/ui/input';
import { Sheet } from '@/ui/sheet';

// Selector de carpeta destino: árbol plegable (se abre desplegado hasta la carpeta actual)
// y, al escribir, lista filtrada con la ruta de cada carpeta.
// Se usa para "Mover carpeta", "Mover tarea" y elegir la carpeta en el formulario de tarea.
// Con teclado sigue el patrón "tree": flechas para recorrer, desplegar y plegar; Enter elige.

const ROOT = '__root__';

interface Row extends TreeKeyRow {
  node: Folder | null;
  depth: number;
  disabled: boolean;
  isCurrent: boolean;
  /** Ruta de la carpeta (solo al buscar). */
  pathLabel: string;
}

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
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const rowRefs = useRef(new Map<string, HTMLDivElement>());

  // Al abrir, el árbol se despliega hasta la carpeta actual; el resto queda plegado.
  const [session, setSession] = useState({ open: false, expanded: new Set<string>() });
  if (session.open !== open) {
    setSession({ open, expanded: open ? ancestorIds(currentId, byId) : session.expanded });
  }
  const expanded = session.expanded;
  const searching = query.trim() !== '';
  const currentKey = currentId ?? ROOT;

  const rows = useMemo((): Row[] => {
    const toRow = (
      node: Folder,
      depth: number,
      parentKey: string | null,
      hasChildren: boolean,
      isExpanded: boolean,
    ): Row => ({
      key: node.id,
      parentKey,
      hasChildren,
      expanded: isExpanded,
      node,
      depth,
      disabled: disabledIds.has(node.id),
      isCurrent: node.id === currentId,
      pathLabel: searching
        ? getPath(node.id, byId)
            .slice(0, -1)
            .map((folder) => folder.name)
            .join(' › ')
        : '',
    });
    if (searching) {
      return flattenTree(children)
        .filter(({ node }) => matchesSearch(node.name, query))
        .map(({ node }) => toRow(node, 0, null, false, false));
    }
    const root: Row[] = allowRoot
      ? [
          {
            key: ROOT,
            parentKey: null,
            hasChildren: false,
            expanded: false,
            node: null,
            depth: 0,
            disabled: false,
            isCurrent: currentKey === ROOT,
            pathLabel: '',
          },
        ]
      : [];
    return root.concat(
      visibleTreeItems(children, expanded).map((item) =>
        toRow(item.node, item.depth, item.parentId, item.hasChildren, item.expanded),
      ),
    );
  }, [searching, query, children, byId, expanded, allowRoot, currentKey, currentId, disabledIds]);

  const canConfirm = selected !== null && selected !== currentKey;
  // Un solo elemento del árbol recibe el foco con Tab (el elegido, el activo o el primero).
  const focusKey =
    [activeKey, selected, currentKey].find((key) => rows.some((row) => row.key === key)) ??
    rows[0]?.key;

  function handleOpenChange(next: boolean) {
    if (!next) {
      setQuery('');
      setSelected(null);
      setActiveKey(null);
    }
    onOpenChange(next);
  }

  function setExpanded(key: string, value: boolean) {
    const next = new Set(expanded);
    if (value) next.add(key);
    else next.delete(key);
    setSession({ open, expanded: next });
  }

  function choose(row: Row) {
    setActiveKey(row.key);
    if (!row.disabled && !row.isCurrent) setSelected(row.key);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>, row: Row) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      choose(row);
      return;
    }
    const action = treeKeyAction(rows, row.key, event.key);
    if (!action) return;
    event.preventDefault();
    if (action.kind === 'focus') {
      setActiveKey(action.key);
      rowRefs.current.get(action.key)?.focus();
    } else {
      setExpanded(action.key, action.kind === 'expand');
    }
  }

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
          onChange={(event) => {
            setQuery(event.target.value);
            setActiveKey(null);
          }}
          aria-label={es.folders.searchFolder}
        />
        {searching && rows.length === 0 ? (
          <p className="py-8 text-center text-body-sm text-muted">{es.folders.noSearchResults}</p>
        ) : null}
        <div role="tree" aria-label={title} className="flex flex-col">
          {rows.map((row) => (
            <div
              key={row.key}
              ref={(element) => {
                if (element) rowRefs.current.set(row.key, element);
                else rowRefs.current.delete(row.key);
              }}
              role="treeitem"
              aria-level={row.depth + 1}
              aria-selected={selected === row.key}
              aria-expanded={row.hasChildren ? row.expanded : undefined}
              aria-disabled={row.disabled || row.isCurrent || undefined}
              tabIndex={row.key === focusKey ? 0 : -1}
              onClick={() => choose(row)}
              onFocus={() => setActiveKey(row.key)}
              onKeyDown={(event) => handleKeyDown(event, row)}
              className={cn(
                'flex min-h-11 w-full items-center gap-2 rounded-sm pr-2 text-left text-body-sm -outline-offset-2',
                row.disabled
                  ? 'cursor-not-allowed text-muted opacity-60'
                  : row.isCurrent
                    ? 'cursor-default text-fg'
                    : 'cursor-pointer text-fg hover:bg-app',
                selected === row.key && 'bg-brand/10 font-medium',
              )}
              style={{ paddingLeft: `${row.depth * 20}px` }}
            >
              {row.hasChildren ? (
                // Para el mouse y el tacto; con teclado se usan las flechas.
                <span
                  aria-hidden
                  onClick={(event) => {
                    event.stopPropagation();
                    setActiveKey(row.key);
                    setExpanded(row.key, !row.expanded);
                  }}
                  className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-sm text-muted hover:text-fg"
                >
                  <ChevronRight
                    className={cn(
                      'size-4 transition-transform duration-(--duration-fast)',
                      row.expanded && 'rotate-90',
                    )}
                  />
                </span>
              ) : (
                <span aria-hidden className="w-2 shrink-0" />
              )}
              {row.node === null ? (
                <House aria-hidden className="size-5 shrink-0 text-muted" />
              ) : row.node.color ? (
                <ColorDot color={row.node.color} />
              ) : (
                <FolderIcon aria-hidden className="size-5 shrink-0 text-muted" />
              )}
              <span className="min-w-0 flex-1 truncate py-2">
                {row.node === null ? es.common.root : row.node.name}
                {row.pathLabel ? (
                  <span className="block truncate text-caption text-muted">{row.pathLabel}</span>
                ) : null}
              </span>
              {row.isCurrent ? (
                <span className="shrink-0 text-caption text-muted">{es.folders.current}</span>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </Sheet>
  );
}
