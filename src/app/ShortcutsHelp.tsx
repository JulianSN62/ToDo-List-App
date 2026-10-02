import { CircleHelp } from 'lucide-react';
import { Fragment, type ReactNode } from 'react';
import { es } from '@/i18n/es';
import { IconButton } from '@/ui/button';
import { Kbd } from '@/ui/kbd';
import { Popover } from '@/ui/popover';
import { useIsSidebarLayout } from '@/ui/useMediaQuery';

// Ayuda discreta con los atajos de teclado (solo desktop): ícono "?" en el encabezado.

const ROWS: { keys: ReactNode; label: string }[] = [
  { keys: <Kbd>N</Kbd>, label: es.shortcuts.newItem },
  {
    keys: (
      <>
        <Kbd>/</Kbd>
        <span className="text-caption text-muted">{es.shortcuts.or}</span>
        <Kbd>Ctrl+K</Kbd>
      </>
    ),
    label: es.shortcuts.search,
  },
  { keys: <Kbd>Esc</Kbd>, label: es.shortcuts.close },
  { keys: <Kbd>Enter</Kbd>, label: es.shortcuts.confirm },
];

export function ShortcutsHelp() {
  const isSidebarLayout = useIsSidebarLayout();
  if (!isSidebarLayout) return null;

  return (
    <Popover
      label={es.shortcuts.title}
      trigger={
        <IconButton aria-label={es.shortcuts.title} size="iconSm">
          <CircleHelp />
        </IconButton>
      }
      className="w-80"
    >
      <h2 className="mb-3 text-body-sm font-semibold text-fg">{es.shortcuts.title}</h2>
      <dl className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-2">
        {ROWS.map((row) => (
          <Fragment key={row.label}>
            <dt className="flex items-center gap-1">{row.keys}</dt>
            <dd className="text-body-sm text-fg">{row.label}</dd>
          </Fragment>
        ))}
      </dl>
    </Popover>
  );
}
