import { CircleAlert } from 'lucide-react';
import { Link } from 'react-router';
import type { Folder } from '@/data';
import { es } from '@/i18n/es';
import type { FolderCounts } from '@/lib/tree';
import { ActionMenu, useContextMenu, type ActionItem } from '@/ui/action-menu';
import { ColorDot } from '@/ui/color-swatch-picker';
import { DragHandle, type DragHandleBinding } from '@/ui/sortable-list';

// Fila de carpeta: asa de arrastre, punto de color, nombre, pendientes (incluye subcarpetas),
// indicador de vencidas y menú de opciones.
export function FolderRow({
  folder,
  counts,
  handle,
  actions,
}: {
  folder: Folder;
  counts: FolderCounts | undefined;
  handle: DragHandleBinding;
  actions: ActionItem[];
}) {
  const pending = counts?.pending ?? 0;
  const overdue = counts?.overdue ?? 0;
  const menu = useContextMenu();
  return (
    <div
      className="flex h-14 items-center border-b border-line pr-1 md:h-12"
      onContextMenu={menu.onContextMenu}
    >
      <DragHandle handle={handle} label={es.common.dragToReorder} />
      <Link to={`/f/${folder.id}`} className="flex h-full min-w-0 flex-1 items-center gap-3 pr-2">
        <ColorDot color={folder.color} />
        <span className="min-w-0 flex-1 truncate text-body text-fg">{folder.name}</span>
        {overdue > 0 ? (
          <CircleAlert aria-label={es.folders.hasOverdue} className="size-4 shrink-0 text-danger" />
        ) : null}
        {pending > 0 ? (
          <span className="shrink-0 text-caption text-muted">
            {es.folders.pendingCount(pending)}
          </span>
        ) : null}
      </Link>
      <ActionMenu
        label={es.folders.folderMenu}
        items={actions}
        open={menu.open}
        onOpenChange={menu.setOpen}
      />
    </div>
  );
}
