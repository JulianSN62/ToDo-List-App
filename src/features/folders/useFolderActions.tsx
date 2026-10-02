import { ArrowDown, ArrowUp, FolderInput, Pencil, Trash2 } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { useUiStore } from '@/app/uiStore';
import { folderRepo, useFolderTree, type Folder } from '@/data';
import { es } from '@/i18n/es';
import { errorMeta, logger } from '@/lib/logger';
import { keyForStep } from '@/lib/ordering';
import { getDescendantIds, getPath } from '@/lib/tree';
import type { ActionItem } from '@/ui/action-menu';
import { ConfirmDialog } from '@/ui/confirm-dialog';
import { showErrorToast, showToast, showUndoToast } from '@/ui/toast';
import { FolderPickerSheet } from './FolderPickerSheet';

// Acciones sobre una carpeta (editar, mover, subir/bajar, eliminar con "Deshacer"),
// compartidas por el menú del encabezado y por las filas de la lista.

interface DeleteRequest {
  folder: Folder;
  folders: number;
  tasks: number;
}

export function useFolderActions(): {
  actionsFor: (folder: Folder) => ActionItem[];
  dialogs: ReactNode;
} {
  const navigate = useNavigate();
  const { children, byId } = useFolderTree();
  const openFolderForm = useUiStore((state) => state.openFolderForm);
  const activeFolderId = useUiStore((state) => state.activeFolderId);
  const [moving, setMoving] = useState<Folder | null>(null);
  const [deleting, setDeleting] = useState<DeleteRequest | null>(null);
  const [busy, setBusy] = useState(false);

  const siblingsOf = (folder: Folder) => children.get(folder.parentId) ?? [];

  async function step(folder: Folder, direction: 'up' | 'down') {
    const key = keyForStep(siblingsOf(folder), folder.id, direction);
    if (!key) return;
    try {
      await folderRepo.setPosition(folder.id, key);
    } catch (error) {
      logger.error('No se pudo reordenar la carpeta', errorMeta(error));
      showErrorToast();
    }
  }

  async function requestDelete(folder: Folder) {
    try {
      const counts = await folderRepo.countContents(folder.id);
      setDeleting({ folder, folders: counts.folders, tasks: counts.tasks });
    } catch (error) {
      logger.error('No se pudo preparar el borrado', errorMeta(error));
      showErrorToast();
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    const { folder } = deleting;
    setBusy(true);
    try {
      // Si se está viendo la carpeta borrada (o algo dentro de ella), se vuelve a su carpeta padre.
      const viewingInside =
        activeFolderId !== null &&
        getPath(activeFolderId, byId).some((item) => item.id === folder.id);
      const snapshot = await folderRepo.softDelete(folder.id);
      setDeleting(null);
      if (viewingInside)
        navigate(folder.parentId ? `/f/${folder.parentId}` : '/', { replace: true });
      showUndoToast(es.folders.deleted, () => {
        void folderRepo.restore(snapshot).catch((error: unknown) => {
          logger.error('No se pudo deshacer el borrado', errorMeta(error));
          showErrorToast();
        });
      });
    } catch (error) {
      logger.error('No se pudo eliminar la carpeta', errorMeta(error));
      showErrorToast();
    } finally {
      setBusy(false);
    }
  }

  async function confirmMove(targetId: string | null) {
    if (!moving) return;
    try {
      await folderRepo.move(moving.id, targetId);
      showToast(es.folders.moved);
    } catch (error) {
      logger.error('No se pudo mover la carpeta', errorMeta(error));
      showErrorToast(es.folders.cannotMoveIntoItself);
    }
  }

  function actionsFor(folder: Folder): ActionItem[] {
    const siblings = siblingsOf(folder);
    const index = siblings.findIndex((item) => item.id === folder.id);
    return [
      {
        key: 'edit',
        label: es.folders.rename,
        icon: <Pencil />,
        onSelect: () =>
          openFolderForm({
            mode: 'edit',
            folderId: folder.id,
            name: folder.name,
            color: folder.color,
          }),
      },
      {
        key: 'move',
        label: es.folders.move,
        icon: <FolderInput />,
        onSelect: () => setMoving(folder),
      },
      {
        key: 'up',
        label: es.common.moveUp,
        icon: <ArrowUp />,
        disabled: index <= 0,
        onSelect: () => void step(folder, 'up'),
      },
      {
        key: 'down',
        label: es.common.moveDown,
        icon: <ArrowDown />,
        disabled: index === -1 || index >= siblings.length - 1,
        onSelect: () => void step(folder, 'down'),
      },
      {
        key: 'delete',
        label: es.folders.delete,
        icon: <Trash2 />,
        danger: true,
        onSelect: () => void requestDelete(folder),
      },
    ];
  }

  const disabledIds = moving
    ? new Set([moving.id, ...getDescendantIds(moving.id, children)])
    : new Set<string>();

  const dialogs = (
    <>
      <FolderPickerSheet
        open={moving !== null}
        onOpenChange={(open) => {
          if (!open) setMoving(null);
        }}
        title={moving ? es.folders.moveTitle(moving.name) : ''}
        allowRoot
        disabledIds={disabledIds}
        currentId={moving?.parentId ?? null}
        onConfirm={(targetId) => void confirmMove(targetId)}
      />
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title={deleting ? es.folders.deleteTitle(deleting.folder.name) : ''}
        description={deleting ? es.folders.deleteDescription(deleting.folders, deleting.tasks) : ''}
        confirmLabel={es.common.delete}
        onConfirm={() => void confirmDelete()}
        busy={busy}
      />
    </>
  );

  return { actionsFor, dialogs };
}
