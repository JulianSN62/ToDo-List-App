import { Pencil, Plus, Tag as TagIcon, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { tagRepo, useTaskTagIndex, type Tag } from '@/data';
import { es } from '@/i18n/es';
import { errorMeta, logger } from '@/lib/logger';
import { ActionMenu } from '@/ui/action-menu';
import { useBackHandler } from '@/ui/backStack';
import { Button, IconButton } from '@/ui/button';
import { ColorDot } from '@/ui/color-swatch-picker';
import { ConfirmDialog } from '@/ui/confirm-dialog';
import { EmptyState } from '@/ui/empty-state';
import { ScreenHeader, ScreenTitle } from '@/ui/screen-header';
import { showErrorToast, showToast } from '@/ui/toast';
import { useIsSidebarLayout } from '@/ui/useMediaQuery';
import { TagFormSheet, type TagFormRequest } from './TagFormSheet';

// Ajustes -> Etiquetas: crear, renombrar, cambiar color y eliminar etiquetas.

interface DeleteRequest {
  tag: Tag;
  tasks: number;
}

export function TagsScreen() {
  const navigate = useNavigate();
  const isSidebarLayout = useIsSidebarLayout();
  const { tags, taskCountByTag } = useTaskTagIndex();
  const [form, setForm] = useState<{ request: TagFormRequest | null; open: boolean; key: number }>({
    request: null,
    open: false,
    key: 0,
  });
  const [deleting, setDeleting] = useState<DeleteRequest | null>(null);
  const [busy, setBusy] = useState(false);

  const goBack = () => navigate('/settings');
  // Botón atrás de Android: vuelve a Ajustes.
  useBackHandler(true, goBack);

  const openForm = (request: TagFormRequest) =>
    setForm((current) => ({ request, open: true, key: current.key + 1 }));

  async function requestDelete(tag: Tag) {
    try {
      setDeleting({ tag, tasks: await tagRepo.countTasks(tag.id) });
    } catch (error) {
      logger.error('No se pudo preparar el borrado de la etiqueta', errorMeta(error));
      showErrorToast();
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    try {
      await tagRepo.remove(deleting.tag.id);
      setDeleting(null);
      showToast(es.tags.deleted);
    } catch (error) {
      logger.error('No se pudo eliminar la etiqueta', errorMeta(error));
      showErrorToast();
    } finally {
      setBusy(false);
    }
  }

  const createButton = isSidebarLayout ? (
    <Button size="sm" onClick={() => openForm({ mode: 'create' })}>
      <Plus />
      {es.tags.newTag}
    </Button>
  ) : (
    <IconButton aria-label={es.tags.newTag} onClick={() => openForm({ mode: 'create' })}>
      <Plus />
    </IconButton>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ScreenHeader onBack={goBack} actions={createButton}>
        <ScreenTitle>{es.tags.title}</ScreenTitle>
      </ScreenHeader>

      <div className="min-h-0 flex-1 overflow-y-auto pb-8">
        <div className="mx-auto w-full max-w-2xl">
          {tags.length === 0 ? (
            <EmptyState icon={<TagIcon />} title={es.tags.emptyTitle} hint={es.tags.emptyHint} />
          ) : (
            <ul className="flex flex-col py-2">
              {tags.map((tag) => (
                <li
                  key={tag.id}
                  className="flex h-14 items-center gap-3 border-b border-line pr-1 pl-4 md:h-12"
                >
                  <ColorDot color={tag.color} />
                  <button
                    type="button"
                    className="flex h-full min-w-0 flex-1 items-center gap-3 text-left"
                    onClick={() => openForm({ mode: 'edit', tag })}
                  >
                    <span className="min-w-0 flex-1 truncate text-body text-fg">{tag.name}</span>
                    <span className="shrink-0 text-caption text-muted">
                      {es.tags.taskCount(taskCountByTag.get(tag.id) ?? 0)}
                    </span>
                  </button>
                  <ActionMenu
                    label={es.tags.menu(tag.name)}
                    items={[
                      {
                        key: 'edit',
                        label: es.tags.edit,
                        icon: <Pencil />,
                        onSelect: () => openForm({ mode: 'edit', tag }),
                      },
                      {
                        key: 'delete',
                        label: es.tags.delete,
                        icon: <Trash2 />,
                        danger: true,
                        onSelect: () => void requestDelete(tag),
                      },
                    ]}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <TagFormSheet
        request={form.request}
        open={form.open}
        formKey={form.key}
        onClose={() => setForm((current) => ({ ...current, open: false }))}
      />
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title={deleting ? es.tags.deleteTitle(deleting.tag.name) : ''}
        description={deleting ? es.tags.deleteDescription(deleting.tasks) : ''}
        confirmLabel={es.common.delete}
        onConfirm={() => void confirmDelete()}
        busy={busy}
      />
    </div>
  );
}
