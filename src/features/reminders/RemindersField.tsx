import { Bell, MapPin, Pencil, Plus, X } from 'lucide-react';
import { useId } from 'react';
import { es } from '@/i18n/es';
import type { ReminderDraft } from '@/lib/reminders';
import { notifications } from '@/platform';
import { Button, IconButton } from '@/ui/button';
import { Switch } from '@/ui/switch';
import { reminderTimesText } from './reminderText';

// Recordatorios y anclado en la ventana de la tarea (spec 9.6 y 9.7). Se guardan junto con
// la tarea ("Crear"/"Guardar"). En la web se pueden editar igual: los avisos llegan en la
// app de Android cuando se abre (X117).

export function RemindersField({
  reminders,
  taskTitle,
  isPinned,
  isDone,
  onPinnedChange,
  onAdd,
  onEdit,
  onRemove,
}: {
  reminders: readonly ReminderDraft[];
  /** Se muestra cuando el recordatorio no tiene mensaje. */
  taskTitle: string;
  isPinned: boolean;
  isDone: boolean;
  onPinnedChange: (pinned: boolean) => void;
  onAdd: () => void;
  onEdit: (key: string) => void;
  onRemove: (key: string) => void;
}) {
  const id = useId();
  const fallbackTitle = taskTitle.trim() || es.reminders.title;

  return (
    <div className="flex flex-col gap-4 border-t border-line pt-4">
      <section aria-labelledby={`${id}-title`} className="flex flex-col gap-2">
        <div className="flex min-h-10 items-center gap-2">
          <h3
            id={`${id}-title`}
            className="flex flex-1 items-center gap-2 text-body-sm font-normal text-muted [&_svg]:size-5"
          >
            <Bell aria-hidden />
            {es.reminders.title}
          </h3>
          <Button variant="secondary" size="sm" onClick={onAdd}>
            <Plus />
            {es.reminders.add}
          </Button>
        </div>
        {reminders.length > 0 ? (
          <ul className="flex flex-col">
            {reminders.map((reminder) => {
              const label = reminder.message.trim() || fallbackTitle;
              return (
                <li key={reminder.key} className="flex min-h-12 min-w-0 items-center gap-1">
                  <div className="min-w-0 flex-1 px-1">
                    <p className="truncate text-body-sm text-fg">{label}</p>
                    <p className="truncate text-caption text-muted tabular-nums">
                      {reminderTimesText(reminder.times)}
                    </p>
                  </div>
                  <IconButton
                    size="iconSm"
                    aria-label={es.reminders.edit(label)}
                    onClick={() => onEdit(reminder.key)}
                  >
                    <Pencil />
                  </IconButton>
                  <IconButton
                    size="iconSm"
                    aria-label={es.reminders.remove(label)}
                    onClick={() => onRemove(reminder.key)}
                  >
                    <X />
                  </IconButton>
                </li>
              );
            })}
          </ul>
        ) : null}
      </section>

      <div className="flex flex-col gap-1">
        <div className="flex min-h-12 items-center gap-2">
          <label
            htmlFor={`${id}-pin`}
            className="flex flex-1 items-center gap-2 text-body-sm text-muted"
          >
            <MapPin aria-hidden className={isPinned ? 'size-5 text-brand' : 'size-5'} />
            {es.reminders.pin}
          </label>
          <Switch
            id={`${id}-pin`}
            checked={isPinned && !isDone}
            disabled={isDone}
            aria-describedby={`${id}-pin-help`}
            onCheckedChange={onPinnedChange}
          />
        </div>
        <p id={`${id}-pin-help`} className="text-caption text-muted">
          {isDone ? es.reminders.pinDoneHelp : es.reminders.pinHelp}
        </p>
      </div>

      {notifications.isSupported() ? null : (
        <p className="text-caption text-muted">{es.reminders.androidNote}</p>
      )}
    </div>
  );
}
