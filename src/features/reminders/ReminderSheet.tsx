import { Plus, X } from 'lucide-react';
import { useId, useState, type FormEvent } from 'react';
import { es } from '@/i18n/es';
import { cn } from '@/lib/cn';
import { newId } from '@/lib/ids';
import {
  MAX_REMINDER_TIMES,
  defaultReminderRow,
  instantToRow,
  validateReminderDraft,
  type ReminderRowError,
  type ReminderTimeRow,
  type ReminderTimeValue,
} from '@/lib/reminders';
import { LIMITS } from '@/lib/validation';
import { Button, IconButton } from '@/ui/button';
import { Input } from '@/ui/input';
import { Sheet } from '@/ui/sheet';

// Ventana de un recordatorio (spec 9.7): mensaje opcional y una o varias fechas y horas.
// No permite fechas pasadas. "Listo" entrega el resultado; quien la abre decide si se guarda
// enseguida (menú de la fila) o con la tarea (ventana de la tarea).

export interface ReminderValue {
  /** Texto tal como se escribió (vacío = se usa el título de la tarea). */
  message: string;
  times: ReminderTimeValue[];
}

export type ReminderSheetRequest =
  { mode: 'create' } | { mode: 'edit'; message: string; times: readonly ReminderTimeValue[] };

const ROW_ERRORS: Record<ReminderRowError, string> = {
  incomplete: es.reminders.errorIncomplete,
  past: es.reminders.errorPast,
};

function ReminderForm({
  request,
  formId,
  onSubmit,
}: {
  request: ReminderSheetRequest;
  formId: string;
  onSubmit: (value: ReminderValue) => void;
}) {
  const id = useId();
  const saved = request.mode === 'edit' ? request.times : [];
  const [message, setMessage] = useState(request.mode === 'edit' ? request.message : '');
  const [rows, setRows] = useState<ReminderTimeRow[]>(() =>
    request.mode === 'edit' && request.times.length > 0
      ? request.times.map((time) => instantToRow(newId(), time.fireAt))
      : [defaultReminderRow(newId())],
  );
  const [rowErrors, setRowErrors] = useState<Record<string, ReminderRowError>>({});
  const [error, setError] = useState<string | null>(null);

  function changeRow(key: string, patch: Partial<ReminderTimeRow>) {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));
    setRowErrors((current) => {
      if (!(key in current)) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
    setError(null);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    // La ventana puede abrirse desde la de la tarea: el envío no tiene que llegar a esa.
    event.stopPropagation();
    const result = validateReminderDraft(message, rows, saved);
    if (!result.ok) {
      setRowErrors(result.rows);
      if (result.error === 'noTimes') setError(es.reminders.errorNoTimes);
      else if (result.error === 'tooMany') setError(es.reminders.errorTooMany(MAX_REMINDER_TIMES));
      else if (result.error === 'messageTooLong') {
        setError(es.reminders.errorMessageTooLong(LIMITS.reminderMessage));
      } else setError(null);
      return;
    }
    onSubmit({ message: result.message ?? '', times: result.times });
  }

  return (
    <form id={formId} noValidate onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <label htmlFor={`${id}-message`} className="text-body-sm text-muted">
          {es.reminders.messageLabel}
        </label>
        <Input
          id={`${id}-message`}
          autoComplete="off"
          maxLength={LIMITS.reminderMessage}
          placeholder={es.reminders.messagePlaceholder}
          value={message}
          onChange={(event) => {
            setMessage(event.target.value);
            setError(null);
          }}
        />
      </div>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-body-sm text-muted">{es.reminders.timesLabel}</legend>
        <p className="-mt-2 text-caption text-muted">{es.reminders.timesHelp}</p>
        <ul className="flex flex-col gap-3">
          {rows.map((row, index) => {
            const rowError = rowErrors[row.key];
            const errorId = `${id}-${row.key}-error`;
            const number = index + 1;
            return (
              <li key={row.key} className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    aria-label={es.reminders.dateLabel(number)}
                    aria-invalid={rowError ? true : undefined}
                    aria-describedby={rowError ? errorId : undefined}
                    value={row.date}
                    onChange={(event) => changeRow(row.key, { date: event.target.value })}
                    className={cn(
                      'h-12 min-w-0 flex-1 rounded-sm border border-line-strong bg-panel px-3 text-body text-fg outline-none focus-visible:border-brand focus-visible:ring-1 focus-visible:ring-brand',
                      rowError && 'border-danger',
                    )}
                  />
                  <div className="w-32 shrink-0">
                    <Input
                      type="time"
                      aria-label={es.reminders.timeLabel(number)}
                      invalid={rowError !== undefined}
                      aria-describedby={rowError ? errorId : undefined}
                      value={row.time}
                      onChange={(event) => changeRow(row.key, { time: event.target.value })}
                      className="tabular-nums"
                    />
                  </div>
                  {rows.length > 1 ? (
                    <IconButton
                      size="iconSm"
                      aria-label={es.reminders.removeTime(number)}
                      onClick={() => {
                        setRows((current) => current.filter((item) => item.key !== row.key));
                        setError(null);
                      }}
                    >
                      <X />
                    </IconButton>
                  ) : null}
                </div>
                {rowError ? (
                  <p id={errorId} role="alert" className="text-caption text-danger">
                    {ROW_ERRORS[rowError]}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
        {rows.length < MAX_REMINDER_TIMES ? (
          <Button
            variant="secondary"
            size="sm"
            className="self-start"
            onClick={() => {
              setRows((current) => [...current, defaultReminderRow(newId())]);
              setError(null);
            }}
          >
            <Plus />
            {es.reminders.addTime}
          </Button>
        ) : null}
      </fieldset>

      {error ? (
        <p role="alert" className="text-caption text-danger">
          {error}
        </p>
      ) : null}
    </form>
  );
}

export function ReminderSheet({
  request,
  open,
  formKey,
  onClose,
  onSubmit,
}: {
  request: ReminderSheetRequest | null;
  open: boolean;
  /** Cambia en cada apertura para reiniciar el formulario. */
  formKey: number;
  onClose: () => void;
  onSubmit: (value: ReminderValue) => void;
}) {
  const formId = useId();
  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={request?.mode === 'edit' ? es.reminders.editReminder : es.reminders.newReminder}
      footer={
        <>
          <Button variant="secondary" className="flex-1 md:flex-none" onClick={onClose}>
            {es.common.cancel}
          </Button>
          <Button type="submit" form={formId} className="flex-1 md:flex-none">
            {es.reminders.done}
          </Button>
        </>
      }
    >
      {request ? (
        <ReminderForm
          key={formKey}
          request={request}
          formId={formId}
          onSubmit={(value) => {
            onSubmit(value);
            onClose();
          }}
        />
      ) : null}
    </Sheet>
  );
}
