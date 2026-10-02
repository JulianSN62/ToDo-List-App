import type { ReactNode } from 'react';
import { es } from '@/i18n/es';
import { cn } from '@/lib/cn';
import { addDaysToLocalDate, isValidLocalDate, nextWeekLocalDate } from '@/lib/dates';

// Fecha límite: atajos (Hoy, Mañana, Próxima semana, Sin fecha) + selector nativo del sistema.

export function Chip({
  active,
  onClick,
  children,
  className,
  ...props
}: {
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
  'aria-pressed'?: boolean;
  'aria-expanded'?: boolean;
  'aria-label'?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border px-3 text-body-sm [&_svg]:size-4',
        active
          ? 'border-brand/40 bg-brand/10 text-brand'
          : 'border-line bg-panel text-muted hover:text-fg',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function DatePicker({
  value,
  today,
  onChange,
  inputId,
}: {
  value: string | null;
  today: string;
  onChange: (value: string | null) => void;
  inputId: string;
}) {
  const shortcuts: Array<{ key: string; label: string; date: string | null }> = [
    { key: 'today', label: es.tasks.dateShortcuts.today, date: today },
    { key: 'tomorrow', label: es.tasks.dateShortcuts.tomorrow, date: addDaysToLocalDate(today, 1) },
    { key: 'nextWeek', label: es.tasks.dateShortcuts.nextWeek, date: nextWeekLocalDate(today) },
    { key: 'none', label: es.tasks.dateShortcuts.none, date: null },
  ];

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {shortcuts.map((shortcut) => (
          <Chip
            key={shortcut.key}
            active={value === shortcut.date}
            aria-pressed={value === shortcut.date}
            onClick={() => onChange(shortcut.date)}
          >
            {shortcut.label}
          </Chip>
        ))}
      </div>
      <input
        id={inputId}
        type="date"
        aria-label={es.tasks.dueDate}
        value={value ?? ''}
        onChange={(event) => {
          const next = event.target.value;
          onChange(next && isValidLocalDate(next) ? next : null);
        }}
        className="h-12 w-full max-w-60 rounded-sm border border-line bg-panel px-3 text-body text-fg outline-none focus-visible:border-brand"
      />
    </div>
  );
}
