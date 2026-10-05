import {
  Bell,
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
import { memo, type ReactNode } from 'react';
import { useTaskFiles, useTaskLinks, useTaskReminders, type Tag, type Task } from '@/data';
import { es } from '@/i18n/es';
import { cn } from '@/lib/cn';
import { colorVar } from '@/lib/colors';
import { diffInLocalDays, formatLongDate, relativeDueLabel } from '@/lib/dates';
import { daysUntilPurge } from '@/lib/retention';
import type { StepAvailability } from '@/lib/taskOrder';
import { ActionMenu, useContextMenu, type ActionItem } from '@/ui/action-menu';
import { Button } from '@/ui/button';
import { ColorDot } from '@/ui/color-swatch-picker';
import { DragHandle, type DragHandleBinding } from '@/ui/sortable-list';
import { TagChip } from '@/ui/tag-chip';
import { toFileListItem } from '../attachments/fileItems';
import { FileList } from '../attachments/FileList';
import { LinkList } from '../attachments/LinkList';
import { reminderTimesText } from '../reminders/reminderText';
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
      <span className="sr-only">{es.tags.listLabel(names)}</span>
      <span
        aria-hidden
        className="inline-flex shrink-0 items-center gap-0.5 text-caption text-muted md:hidden"
      >
        <TagIcon className="size-3.5" />
        {tags.length}
      </span>
      <span
        aria-hidden
        className="hidden max-w-64 min-w-0 shrink items-center gap-1 md:inline-flex"
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

// Indicadores de una tarea pendiente (anclada, etiquetas, adjuntos, recordatorios, fecha límite).
// Se usan dos veces: debajo del título en mobile (envuelven si no entran) y a la
// derecha del título en desktop (hay lugar de sobra en una sola línea).
function PendingIndicators({
  task,
  tags,
  attachmentCount,
  reminderCount,
  today,
}: {
  task: Task;
  tags: readonly Tag[];
  attachmentCount: number;
  reminderCount: number;
  today: string;
}) {
  if (task.isDone) return null;
  return (
    <>
      {task.isPinned ? (
        <MapPin role="img" aria-label={es.tasks.pinned} className="size-4 shrink-0 text-brand" />
      ) : null}
      <TagIndicator tags={tags} />
      {attachmentCount > 0 ? (
        <span className="inline-flex shrink-0 items-center gap-0.5 text-caption text-muted">
          <Paperclip aria-hidden className="size-3.5" />
          <span aria-hidden>{attachmentCount}</span>
          <span className="sr-only">{es.links.count(attachmentCount)}</span>
        </span>
      ) : null}
      {reminderCount > 0 ? (
        <span className="inline-flex shrink-0 items-center gap-0.5 text-caption text-muted">
          <Bell aria-hidden className="size-3.5" />
          <span aria-hidden>{reminderCount}</span>
          <span className="sr-only">{es.reminders.indicator(reminderCount)}</span>
        </span>
      ) : null}
      {task.dueDate ? <DueChip dueDate={task.dueDate} today={today} /> : null}
    </>
  );
}

// Detalles desplegados: descripción completa, fecha larga, prioridad, color, etiquetas, links,
// archivos y recordatorios.
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
  const { reminders } = useTaskReminders(task.id);
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
    files.length > 0 ||
    reminders.length > 0;

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
      {reminders.length > 0 ? (
        <ul className="flex w-full flex-col gap-1" aria-label={es.reminders.title}>
          {reminders.map((reminder) => (
            <li key={reminder.id} className="flex min-w-0 items-start gap-2 text-body-sm">
              <Bell aria-hidden className="mt-0.5 size-4 shrink-0 text-muted" />
              <span className="min-w-0">
                <span className="text-fg">{reminder.message ?? task.title}</span>
                <span className="text-muted tabular-nums">
                  {' '}
                  · {reminderTimesText(reminder.times)}
                </span>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
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

export interface TaskRowProps {
  task: Task;
  today: string;
  /** Solo las pendientes se pueden reordenar. */
  handle?: DragHandleBinding;
  /** Con orden manual (asa): si puede subir o bajar en su grupo (Subir/Bajar del menú). */
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  selected?: boolean;
  retentionDays: number;
  expanded: boolean;
  tags?: readonly Tag[];
  attachmentCount?: number;
  /** Recordatorios con fechas pendientes. */
  reminderCount?: number;
  /** Segunda línea debajo del título (ruta de la carpeta en las vistas globales). */
  subtitle?: ReactNode;
  // Las funciones reciben la tarea: así no cambian entre renders y la fila memorizada
  // solo se vuelve a dibujar cuando cambian sus datos (listas largas).
  /** Arma el menú al abrirlo. steps = null: sin Subir/Bajar. */
  getActions: (task: Task, steps: StepAvailability | null) => ActionItem[];
  onToggleExpanded: (taskId: string) => void;
  onOpen: (task: Task) => void;
  onToggleDone: (task: Task) => void;
  onDelete: (task: Task) => void;
  /** Vistas globales: botón "Ir a la carpeta" en los detalles. */
  onGoToFolder?: (task: Task) => void;
}

export const TaskRow = memo(function TaskRow({
  task,
  today,
  handle,
  canMoveUp = false,
  canMoveDown = false,
  selected,
  retentionDays,
  expanded,
  tags = [],
  attachmentCount = 0,
  reminderCount = 0,
  subtitle,
  getActions,
  onToggleExpanded,
  onOpen,
  onToggleDone,
  onDelete,
  onGoToFolder,
}: TaskRowProps) {
  const detailsId = `task-details-${task.id}`;
  // Si hay algo para mostrar aparte del título: en mobile se desplaza a una segunda
  // línea (junto con la ruta de carpeta, si hay) en vez de amontonarse junto al título.
  const hasPendingIndicators =
    !task.isDone &&
    (task.isPinned ||
      tags.length > 0 ||
      attachmentCount > 0 ||
      reminderCount > 0 ||
      task.dueDate !== null);
  const swipe = useSwipeActions({
    enabled: !task.isDone,
    onSwipeRight: () => onToggleDone(task),
    onSwipeLeft: () => onDelete(task),
  });
  const menu = useContextMenu();

  return (
    <div
      className="border-b border-line [&_:focus-visible]:-outline-offset-2"
      onContextMenu={menu.onContextMenu}
    >
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
            // Tarea abierta: recuadro del color de acento (el texto secundario sigue legible).
            selected && 'bg-panel ring-2 ring-brand ring-inset',
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
            <DragHandle handle={handle} label={es.common.dragItem(task.title)} />
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
            onClick={() => onToggleDone(task)}
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
            onClick={() => onOpen(task)}
            className="flex h-full min-w-0 flex-1 items-center gap-2 pr-1 text-left"
          >
            {task.isPriority && !task.isDone ? (
              <Star
                role="img"
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
                        reminderCount={reminderCount}
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
                  reminderCount={reminderCount}
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
            onClick={() => onToggleExpanded(task.id)}
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
            label={es.tasks.menu(task.title)}
            items={() => getActions(task, handle ? { up: canMoveUp, down: canMoveDown } : null)}
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
          onEdit={() => onOpen(task)}
          onGoToFolder={onGoToFolder ? () => onGoToFolder(task) : undefined}
        />
      ) : null}
    </div>
  );
});
