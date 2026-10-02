import {
  Calendar,
  Check,
  ChevronDown,
  Circle,
  FolderOpen,
  MapPin,
  Paperclip,
  Pencil,
  Star,
  Tag as TagIcon,
  Trash2,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useTaskFiles, useTaskLinks, type Tag, type Task } from '@/data';
import { es } from '@/i18n/es';
import { cn } from '@/lib/cn';
import { colorVar } from '@/lib/colors';
import { diffInLocalDays, formatLongDate, relativeDueLabel } from '@/lib/dates';
import { daysUntilPurge } from '@/lib/retention';
import { ActionMenu, useContextMenu, type ActionItem } from '@/ui/action-menu';
import { Button } from '@/ui/button';
import { ColorDot } from '@/ui/color-swatch-picker';
import { DragHandle, type DragHandleBinding } from '@/ui/sortable-list';
import { TagChip } from '@/ui/tag-chip';
import { toFileListItem } from '../attachments/fileItems';
import { FileList } from '../attachments/FileList';
import { LinkList } from '../attachments/LinkList';
import { useSwipeActions } from './useSwipeActions';

// Fila de tarea: franja de color, asa, casilla, título, indicadores, flecha y menú.
// En mobile se puede deslizar: a la derecha completa, a la izquierda elimina.
// La flecha despliega los detalles debajo de la fila sin bloquear la app.

const MAX_VISIBLE_TAGS = 2;

function DueChip({ dueDate, today }: { dueDate: string; today: string }) {
  const due = relativeDueLabel(dueDate, today);
  return (
    <span
      className={cn(
        'inline-flex h-6 shrink-0 items-center gap-1 rounded-full px-2 text-caption',
        due.tone === 'overdue'
          ? 'bg-danger-soft text-danger'
          : due.tone === 'today'
            ? 'text-brand'
            : 'text-muted',
      )}
    >
      <Calendar aria-hidden className="size-3.5" />
      {due.label}
    </span>
  );
}

// Etiquetas en la fila: en mobile, ícono y cantidad; en desktop, hasta 2 chips y "+N".
function TagIndicator({ tags }: { tags: readonly Tag[] }) {
  if (tags.length === 0) return null;
  const visible = tags.slice(0, MAX_VISIBLE_TAGS);
  const hidden = tags.length - visible.length;
  const names = tags.map((tag) => tag.name).join(', ');
  return (
    <>
      <span
        className="inline-flex shrink-0 items-center gap-0.5 text-caption text-muted md:hidden"
        aria-label={`${es.tags.title}: ${names}`}
      >
        <TagIcon aria-hidden className="size-3.5" />
        {tags.length}
      </span>
      <span
        className="hidden max-w-64 min-w-0 shrink items-center gap-1 md:inline-flex"
        aria-label={`${es.tags.title}: ${names}`}
      >
        {visible.map((tag) => (
          <TagChip key={tag.id} name={tag.name} color={tag.color} size="sm" className="max-w-28" />
        ))}
        {hidden > 0 ? (
          <span className="shrink-0 text-caption text-muted">{es.tags.more(hidden)}</span>
        ) : null}
      </span>
    </>
  );
}

// Indicadores de una tarea pendiente (anclada, etiquetas, adjuntos, fecha límite).
// Se usan dos veces: debajo del título en mobile (envuelven si no entran) y a la
// derecha del título en desktop (hay lugar de sobra en una sola línea).
function PendingIndicators({
  task,
  tags,
  attachmentCount,
  today,
}: {
  task: Task;
  tags: readonly Tag[];
  attachmentCount: number;
  today: string;
}) {
  if (task.isDone) return null;
  return (
    <>
      {task.isPinned ? (
        <MapPin aria-label={es.tasks.pin} className="size-4 shrink-0 text-brand" />
      ) : null}
      <TagIndicator tags={tags} />
      {attachmentCount > 0 ? (
        <span
          className="inline-flex shrink-0 items-center gap-0.5 text-caption text-muted"
          aria-label={es.links.count(attachmentCount)}
        >
          <Paperclip aria-hidden className="size-3.5" />
          {attachmentCount}
        </span>
      ) : null}
      {task.dueDate ? <DueChip dueDate={task.dueDate} today={today} /> : null}
    </>
  );
}

// Detalles desplegados: descripción completa, fecha larga, prioridad, color, etiquetas y links.
function TaskRowDetails({
  id,
  task,
  tags,
  today,
  indented,
  onEdit,
  onGoToFolder,
}: {
  id: string;
  task: Task;
  tags: readonly Tag[];
  today: string;
  indented: boolean;
  onEdit: () => void;
  onGoToFolder?: () => void;
}) {
  const { links } = useTaskLinks(task.id);
  const { files } = useTaskFiles(task.id);
  const due = task.dueDate ? relativeDueLabel(task.dueDate, today) : null;
  // La etiqueta relativa solo aporta para fechas cercanas o vencidas.
  const showRelative = task.dueDate !== null && diffInLocalDays(task.dueDate, today) <= 1;
  const hasDetails =
    task.description ||
    task.dueDate ||
    task.isPriority ||
    task.color ||
    tags.length > 0 ||
    links.length > 0 ||
    files.length > 0;

  return (
    <div
      id={id}
      className={cn(
        'flex flex-col items-start gap-2 bg-panel py-3 pr-4',
        indented ? 'pl-20' : 'pl-14',
      )}
    >
      {task.description ? (
        <p className="w-full text-body-sm break-words whitespace-pre-wrap text-fg">
          {task.description}
        </p>
      ) : null}
      {task.dueDate && due ? (
        <p className="flex flex-wrap items-center gap-x-2 text-body-sm text-muted">
          <Calendar aria-hidden className="size-4 shrink-0" />
          <span>
            {es.tasks.dueDate}: {formatLongDate(task.dueDate, today)}
          </span>
          {showRelative ? (
            <span
              className={cn(
                due.tone === 'overdue' && 'text-danger',
                due.tone === 'today' && 'text-brand',
              )}
            >
              · {due.label}
            </span>
          ) : null}
        </p>
      ) : null}
      {task.isPriority ? (
        <p className="flex items-center gap-2 text-body-sm text-muted">
          <Star aria-hidden className="size-4 shrink-0 fill-star text-star" />
          {es.tasks.isPriority}
        </p>
      ) : null}
      {task.color ? (
        <p className="flex items-center gap-2 text-body-sm text-muted">
          <ColorDot color={task.color} />
          {es.colors.names[task.color]}
        </p>
      ) : null}
      {tags.length > 0 ? (
        <ul className="flex max-w-full flex-wrap gap-2" aria-label={es.tags.title}>
          {tags.map((tag) => (
            <li key={tag.id} className="max-w-full">
              <TagChip name={tag.name} color={tag.color} />
            </li>
          ))}
        </ul>
      ) : null}
      <LinkList links={links} />
      <FileList items={files.map(toFileListItem)} />
      {hasDetails ? null : <p className="text-body-sm text-muted">{es.tasks.noDetails}</p>}
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" onClick={onEdit}>
          <Pencil />
          {es.common.edit}
        </Button>
        {onGoToFolder ? (
          <Button variant="secondary" size="sm" onClick={onGoToFolder}>
            <FolderOpen />
            {es.tasks.goToFolder}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export function TaskRow({
  task,
  today,
  handle,
  actions,
  selected,
  retentionDays,
  expanded,
  tags = [],
  attachmentCount = 0,
  subtitle,
  onToggleExpanded,
  onOpen,
  onToggleDone,
  onDelete,
  onGoToFolder,
}: {
  task: Task;
  today: string;
  /** Solo las pendientes se pueden reordenar. */
  handle?: DragHandleBinding;
  actions: ActionItem[];
  selected?: boolean;
  retentionDays: number;
  expanded: boolean;
  tags?: readonly Tag[];
  attachmentCount?: number;
  /** Segunda línea debajo del título (ruta de la carpeta en las vistas globales). */
  subtitle?: ReactNode;
  onToggleExpanded: () => void;
  onOpen: () => void;
  onToggleDone: () => void;
  onDelete: () => void;
  /** Vistas globales: botón "Ir a la carpeta" en los detalles. */
  onGoToFolder?: () => void;
}) {
  const detailsId = `task-details-${task.id}`;
  // Si hay algo para mostrar aparte del título: en mobile se desplaza a una segunda
  // línea (junto con la ruta de carpeta, si hay) en vez de amontonarse junto al título.
  const hasPendingIndicators =
    !task.isDone &&
    (task.isPinned || tags.length > 0 || attachmentCount > 0 || task.dueDate !== null);
  const swipe = useSwipeActions({
    enabled: !task.isDone,
    onSwipeRight: onToggleDone,
    onSwipeLeft: onDelete,
  });
  const menu = useContextMenu();

  return (
    <div className="border-b border-line" onContextMenu={menu.onContextMenu}>
      <div className="relative overflow-hidden">
        {/* Fondos que aparecen al deslizar */}
        {swipe.dragging ? (
          <div
            aria-hidden
            className={cn(
              'absolute inset-0 flex items-center justify-between px-6',
              swipe.offset > 0 ? 'bg-success-soft' : 'bg-danger-soft',
            )}
          >
            <span
              className={cn(
                'flex items-center gap-2 text-body-sm font-medium text-success',
                swipe.offset <= 0 && 'invisible',
              )}
            >
              <Check className="size-5" />
              {es.tasks.swipeComplete}
            </span>
            <span
              className={cn(
                'flex items-center gap-2 text-body-sm font-medium text-danger',
                swipe.offset >= 0 && 'invisible',
              )}
            >
              {es.tasks.swipeDelete}
              <Trash2 className="size-5" />
            </span>
          </div>
        ) : null}

        <div
          {...swipe.handlers}
          className={cn(
            'relative flex min-h-14 touch-pan-y items-center bg-app py-1.5 pr-1 md:min-h-12 md:py-1',
            selected && 'bg-brand/10',
            swipe.dragging
              ? 'transition-none'
              : 'transition-transform duration-(--duration-base) ease-standard',
          )}
          style={{ transform: swipe.offset ? `translateX(${swipe.offset}px)` : undefined }}
        >
          {task.color ? (
            <span
              aria-hidden
              className={cn('absolute inset-y-0 left-0 w-1', task.isDone && 'opacity-50')}
              style={{ backgroundColor: colorVar(task.color) }}
            />
          ) : null}

          {handle ? (
            <DragHandle handle={handle} label={es.common.dragToReorder} />
          ) : (
            <span className="w-2 shrink-0" aria-hidden />
          )}

          <button
            type="button"
            role="checkbox"
            aria-checked={task.isDone}
            aria-label={
              task.isDone ? es.tasks.markUndone(task.title) : es.tasks.markDone(task.title)
            }
            onClick={onToggleDone}
            className="flex size-12 shrink-0 items-center justify-center"
          >
            {task.isDone ? (
              <span className="flex size-5 items-center justify-center rounded-full bg-success text-on-brand">
                <Check aria-hidden className="size-3.5" strokeWidth={3} />
              </span>
            ) : (
              <Circle aria-hidden className="size-5 text-muted" />
            )}
          </button>

          <button
            type="button"
            onClick={onOpen}
            className="flex h-full min-w-0 flex-1 items-center gap-2 pr-1 text-left"
          >
            {task.isPriority && !task.isDone ? (
              <Star
                aria-label={es.tasks.isPriority}
                className="size-4 shrink-0 fill-star text-star"
              />
            ) : null}
            <span className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
              <span
                className={cn(
                  'truncate text-body',
                  task.isDone ? 'text-muted line-through' : 'text-fg',
                )}
              >
                {task.title}
              </span>
              {subtitle || hasPendingIndicators ? (
                <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-caption text-muted">
                  {subtitle ? (
                    <span className="flex min-w-0 items-center gap-2">{subtitle}</span>
                  ) : null}
                  {hasPendingIndicators ? (
                    // En desktop estos mismos indicadores se repiten a la derecha del título
                    // (hay lugar de sobra); acá solo se ven en mobile para no duplicarlos.
                    <span className="flex shrink-0 items-center gap-2 md:hidden">
                      <PendingIndicators
                        task={task}
                        tags={tags}
                        attachmentCount={attachmentCount}
                        today={today}
                      />
                    </span>
                  ) : null}
                </span>
              ) : null}
            </span>
            {task.isDone ? (
              <span className="shrink-0 text-caption text-muted">
                {es.tasks.deletesIn(daysUntilPurge(task.doneAt, retentionDays))}
              </span>
            ) : (
              <span className="hidden shrink-0 items-center gap-2 md:flex">
                <PendingIndicators
                  task={task}
                  tags={tags}
                  attachmentCount={attachmentCount}
                  today={today}
                />
              </span>
            )}
          </button>

          <button
            type="button"
            aria-expanded={expanded}
            aria-controls={expanded ? detailsId : undefined}
            aria-label={
              expanded ? es.tasks.hideDetails(task.title) : es.tasks.showDetails(task.title)
            }
            onClick={onToggleExpanded}
            className="flex h-12 w-10 shrink-0 items-center justify-center rounded-full text-muted hover:text-fg"
          >
            <ChevronDown
              aria-hidden
              className={cn(
                'size-5 transition-transform duration-(--duration-fast)',
                expanded && 'rotate-180',
              )}
            />
          </button>

          <ActionMenu
            label={es.tasks.menu}
            items={actions}
            open={menu.open}
            onOpenChange={menu.setOpen}
          />
        </div>
      </div>

      {expanded ? (
        <TaskRowDetails
          id={detailsId}
          task={task}
          tags={tags}
          today={today}
          indented={handle !== undefined}
          onEdit={onOpen}
          onGoToFolder={onGoToFolder}
        />
      ) : null}
    </div>
  );
}
