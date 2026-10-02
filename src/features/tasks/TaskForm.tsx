import {
  Bell,
  Calendar,
  Folder as FolderIcon,
  Lock,
  MapPin,
  Palette,
  Star,
  Trash2,
} from 'lucide-react';
import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { taskRepo, useFolderTree, type Task, type TaskLink } from '@/data';
import { es } from '@/i18n/es';
import { newId } from '@/lib/ids';
import { errorMeta, logger } from '@/lib/logger';
import {
  applyLinkDraft,
  diffTaskForm,
  emptyTaskForm,
  hasTaskFormChanges,
  isLinkDraftDirty,
  isTaskFormDirty,
  linksToCreate,
  taskToForm,
  validateTaskForm,
  type LinkEditorDraft,
  type TaskFormValues,
} from '@/lib/taskForm';
import { getPath } from '@/lib/tree';
import { LIMITS, normalizeDescription, normalizeTitle } from '@/lib/validation';
import { platform } from '@/platform';
import { Button } from '@/ui/button';
import { ColorSwatchPicker } from '@/ui/color-swatch-picker';
import { Input } from '@/ui/input';
import { SheetBody, SheetFooter } from '@/ui/sheet';
import { Switch } from '@/ui/switch';
import { AutoTextarea } from '@/ui/textarea';
import { showErrorToast, showToast } from '@/ui/toast';
import { LinksField } from '../attachments/LinksField';
import { FolderPickerSheet } from '../folders/FolderPickerSheet';
import { TagsField } from '../tags/TagsField';
import { DatePicker } from './DatePicker';
import { deleteTaskWithUndo } from './useTaskActions';

// Formulario de la ventana de tarea: crear o ver/editar con todos los campos.
// Solo el título es obligatorio. Se guarda con los botones del pie (o Enter en el título).

export type TaskFormMode =
  | { kind: 'create'; folderId: string }
  | { kind: 'edit'; task: Task; tagIds: string[]; links: TaskLink[] };

function report(error: unknown) {
  logger.error('No se pudo guardar la tarea', errorMeta(error));
  showErrorToast();
}

function Field({
  icon,
  label,
  htmlFor,
  children,
}: {
  icon?: ReactNode;
  label: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={htmlFor}
        className="flex items-center gap-2 text-body-sm text-muted [&_svg]:size-5"
      >
        {icon}
        {label}
      </label>
      {children}
    </div>
  );
}

// Campos que todavía no están disponibles: se muestran bloqueados.
function LockedRow({ icon, label, note }: { icon: ReactNode; label: string; note: string }) {
  return (
    <div className="flex min-h-12 items-center gap-2 text-body-sm text-muted [&_svg]:size-5">
      {icon}
      <span className="flex-1">{label}</span>
      <Lock aria-hidden className="size-4" />
      <span className="text-caption">{note}</span>
    </div>
  );
}

export function TaskForm({
  mode,
  today,
  onClose,
  onCancel,
  onDirtyChange,
}: {
  mode: TaskFormMode;
  today: string;
  /** Cierra sin preguntar (después de guardar o eliminar). */
  onClose: () => void;
  /** El usuario pide cerrar: si hay cambios sin guardar se confirma antes. */
  onCancel: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const id = useId();
  const { byId } = useFolderTree();
  const titleRef = useRef<HTMLInputElement>(null);
  const isCreate = mode.kind === 'create';

  // Valores con los que se compara para saber si hay cambios sin guardar.
  const [baseline, setBaseline] = useState<TaskFormValues>(() =>
    mode.kind === 'create'
      ? emptyTaskForm(mode.folderId)
      : taskToForm(mode.task, { tagIds: mode.tagIds, links: mode.links }),
  );
  const [values, setValues] = useState<TaskFormValues>(baseline);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [pickingFolder, setPickingFolder] = useState(false);
  // Link que se está escribiendo (todavía no forma parte de la lista).
  const [linkDraft, setLinkDraft] = useState<LinkEditorDraft | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);

  const dirty = isTaskFormDirty(baseline, values) || isLinkDraftDirty(values.links, linkDraft);
  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);
  useEffect(() => () => onDirtyChange?.(false), [onDirtyChange]);

  const change = (patch: Partial<TaskFormValues>) =>
    setValues((current) => ({ ...current, ...patch }));

  const folderPath = getPath(values.folderId, byId)
    .map((folder) => folder.name)
    .join(' › ');

  function changeLinkDraft(draft: LinkEditorDraft | null) {
    setLinkDraft(draft);
    setLinkError(null);
  }

  // Suma a la lista el link que se está escribiendo. null si la dirección no es válida.
  function linksWithDraft(): TaskFormValues['links'] | null {
    if (!linkDraft) return values.links;
    const links = applyLinkDraft(values.links, linkDraft, newId);
    if (!links) setLinkError(es.links.invalidUrl);
    return links;
  }

  function commitLinkDraft() {
    const links = linksWithDraft();
    if (!links) return;
    change({ links });
    changeLinkDraft(null);
  }

  // Valores listos para guardar: título válido y link en edición incorporado.
  function resolveValues(): TaskFormValues | null {
    const problem = validateTaskForm(values);
    if (problem) {
      setError(
        problem === 'titleRequired'
          ? es.tasks.titleRequired
          : es.tasks.titleTooLong(LIMITS.taskTitle),
      );
      titleRef.current?.focus();
      return null;
    }
    const links = linksWithDraft();
    if (!links) return null;
    if (linkDraft) changeLinkDraft(null);
    return { ...values, links };
  }

  function toCreateInput(submitted: TaskFormValues) {
    return {
      folderId: submitted.folderId,
      title: normalizeTitle(submitted.title) ?? submitted.title,
      description: normalizeDescription(submitted.description),
      dueDate: submitted.dueDate,
      isPriority: submitted.isPriority,
      color: submitted.color,
      tagIds: submitted.tagIds,
      links: linksToCreate(submitted.links),
    };
  }

  async function createAndClose() {
    if (mode.kind !== 'create') return;
    const submitted = resolveValues();
    if (!submitted) return;
    setValues(submitted);
    setSaving(true);
    try {
      await taskRepo.create(toCreateInput(submitted));
      onClose();
    } catch (caught) {
      report(caught);
    } finally {
      setSaving(false);
    }
  }

  // Guarda y deja la ventana lista para la siguiente. Título, descripción y links se vacían
  // enseguida para seguir escribiendo; fecha, prioridad, color, etiquetas y carpeta se mantienen.
  async function createAndContinue() {
    if (mode.kind !== 'create') return;
    const submitted = resolveValues();
    if (!submitted) return;
    const next = { ...submitted, title: '', description: '', links: [] };
    setValues(next);
    setBaseline(next);
    setError(null);
    titleRef.current?.focus();
    try {
      await taskRepo.create(toCreateInput(submitted));
      showToast(es.tasks.created);
    } catch (caught) {
      report(caught);
      // Si no se empezó a escribir otra, se recupera lo que no se pudo guardar.
      setValues((current) =>
        current.title || current.description || current.links.length > 0
          ? current
          : {
              ...current,
              title: submitted.title,
              description: submitted.description,
              links: submitted.links,
            },
      );
    }
  }

  async function saveChanges() {
    if (mode.kind !== 'edit') return;
    const submitted = resolveValues();
    if (!submitted) return;
    setValues(submitted);
    const changes = diffTaskForm(baseline, submitted);
    setSaving(true);
    try {
      if (hasTaskFormChanges(changes)) await taskRepo.applyEdits(mode.task.id, changes);
      onClose();
    } catch (caught) {
      report(caught);
    } finally {
      setSaving(false);
    }
  }

  const submitPrimary = () => void (isCreate ? createAndClose() : saveChanges());

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    submitPrimary();
  }

  // Ctrl/Cmd + Enter guarda desde cualquier campo (también desde la descripción).
  function handleKeyDown(event: KeyboardEvent<HTMLFormElement>) {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      submitPrimary();
    }
  }

  const nativeNote = platform.isNative ? es.tasks.nativeComingSoon : es.tasks.nativeOnly;

  return (
    <>
      <SheetBody>
        <form
          id={`${id}-form`}
          noValidate
          aria-label={isCreate ? es.tasks.newTask : es.tasks.editTask}
          onSubmit={handleSubmit}
          onKeyDown={handleKeyDown}
          className="flex flex-col gap-6"
        >
          <Field label={es.tasks.titleLabel} htmlFor={`${id}-title`}>
            <Input
              ref={titleRef}
              id={`${id}-title`}
              autoFocus={isCreate}
              autoComplete="off"
              enterKeyHint="done"
              maxLength={LIMITS.taskTitle}
              placeholder={es.tasks.titlePlaceholder}
              invalid={error !== null}
              aria-describedby={error ? `${id}-title-error` : undefined}
              value={values.title}
              onChange={(event) => {
                change({ title: event.target.value });
                setError(null);
              }}
              onKeyDown={(event) => {
                // Enter en el título guarda (acción principal), salvo mientras se compone texto.
                if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  if (!event.ctrlKey && !event.metaKey) submitPrimary();
                }
              }}
            />
            {error ? (
              <p id={`${id}-title-error`} role="alert" className="text-caption text-danger">
                {error}
              </p>
            ) : null}
          </Field>

          <Field label={es.tasks.descriptionLabel} htmlFor={`${id}-description`}>
            <AutoTextarea
              id={`${id}-description`}
              placeholder={es.tasks.descriptionPlaceholder}
              maxLength={LIMITS.taskDescription}
              value={values.description}
              onChange={(event) => change({ description: event.target.value })}
              className="min-h-24 border-line bg-panel text-body-sm"
            />
          </Field>

          <Field icon={<Calendar aria-hidden />} label={es.tasks.dueDate} htmlFor={`${id}-due`}>
            <DatePicker
              inputId={`${id}-due`}
              value={values.dueDate}
              today={today}
              onChange={(dueDate) => change({ dueDate })}
            />
          </Field>

          <div className="flex min-h-12 items-center gap-2">
            <label
              htmlFor={`${id}-priority`}
              className="flex flex-1 items-center gap-2 text-body-sm text-muted"
            >
              <Star
                aria-hidden
                className={values.isPriority ? 'size-5 fill-star text-star' : 'size-5'}
              />
              {es.tasks.priority}
            </label>
            <Switch
              id={`${id}-priority`}
              checked={values.isPriority}
              onCheckedChange={(isPriority) => change({ isPriority })}
            />
          </div>

          <Field icon={<Palette aria-hidden />} label={es.tasks.color}>
            <ColorSwatchPicker
              value={values.color}
              onChange={(color) => change({ color })}
              label={es.tasks.color}
            />
          </Field>

          <TagsField tagIds={values.tagIds} onChange={(tagIds) => change({ tagIds })} />

          <div className="flex min-h-12 items-center gap-2 text-body-sm">
            <FolderIcon aria-hidden className="size-5 shrink-0 text-muted" />
            <span className="text-muted">{es.tasks.folder}</span>
            <span className="min-w-0 flex-1 truncate text-fg">{folderPath}</span>
            <Button variant="secondary" size="sm" onClick={() => setPickingFolder(true)}>
              {es.tasks.changeFolder}
            </Button>
          </div>

          <LinksField
            links={values.links}
            draft={linkDraft}
            error={linkError}
            onDraftChange={changeLinkDraft}
            onCommitDraft={commitLinkDraft}
            onRemove={(key) => change({ links: values.links.filter((link) => link.key !== key) })}
          />

          <div className="flex flex-col border-t border-line pt-2">
            <LockedRow icon={<Bell aria-hidden />} label={es.tasks.reminders} note={nativeNote} />
            <LockedRow icon={<MapPin aria-hidden />} label={es.tasks.pin} note={nativeNote} />
          </div>

          {mode.kind === 'edit' ? (
            <Button
              variant="dangerGhost"
              block
              onClick={() => {
                onClose();
                deleteTaskWithUndo(mode.task);
              }}
            >
              <Trash2 />
              {es.tasks.deleteTask}
            </Button>
          ) : null}
        </form>
      </SheetBody>

      <SheetFooter>
        {isCreate ? (
          <>
            <Button
              variant="secondary"
              className="flex-1 md:flex-none"
              disabled={saving}
              onClick={() => void createAndContinue()}
            >
              {es.tasks.createAndAddAnother}
            </Button>
            <Button
              type="submit"
              form={`${id}-form`}
              className="flex-1 md:flex-none"
              disabled={saving}
            >
              {es.common.create}
            </Button>
          </>
        ) : (
          <>
            <Button variant="secondary" className="flex-1 md:flex-none" onClick={onCancel}>
              {es.common.cancel}
            </Button>
            <Button
              type="submit"
              form={`${id}-form`}
              className="flex-1 md:flex-none"
              disabled={saving}
            >
              {es.common.save}
            </Button>
          </>
        )}
      </SheetFooter>

      <FolderPickerSheet
        open={pickingFolder}
        onOpenChange={setPickingFolder}
        title={es.tasks.chooseFolder}
        allowRoot={false}
        disabledIds={new Set<string>()}
        currentId={values.folderId}
        confirmLabel={es.tasks.choose}
        onConfirm={(folderId) => {
          if (folderId) change({ folderId });
        }}
      />
    </>
  );
}
