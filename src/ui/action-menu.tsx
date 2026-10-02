import { EllipsisVertical } from 'lucide-react';
import { DropdownMenu } from 'radix-ui';
import { useState, type MouseEvent, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { IconButton } from './button';
import { Sheet } from './sheet';
import { useIsSidebarLayout } from './useMediaQuery';

// Menú de opciones: lista en bottom sheet en mobile, dropdown en desktop.
// En desktop también se abre con clic derecho sobre la fila (useContextMenu).

export interface ActionItem {
  key: string;
  label: string;
  icon?: ReactNode;
  onSelect: () => void;
  danger?: boolean;
  disabled?: boolean;
}

const itemClass =
  'flex h-12 w-full items-center gap-3 rounded-sm px-3 text-left text-body-sm outline-none [&_svg]:size-5 [&_svg]:shrink-0';

export function ActionMenu({
  label,
  items,
  triggerClassName,
  size = 'icon',
  open: openProp,
  onOpenChange,
}: {
  label: string;
  items: ActionItem[];
  triggerClassName?: string;
  size?: 'icon' | 'iconSm';
  /** Apertura controlada desde afuera (por ejemplo, con clic derecho en la fila). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const isSidebarLayout = useIsSidebarLayout();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = openProp ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  const trigger = (
    <IconButton aria-label={label} size={size} className={triggerClassName}>
      <EllipsisVertical />
    </IconButton>
  );

  if (isSidebarLayout) {
    return (
      <DropdownMenu.Root open={open} onOpenChange={setOpen}>
        <DropdownMenu.Trigger asChild>{trigger}</DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="end"
            sideOffset={4}
            className="z-50 min-w-56 rounded-sm border border-line bg-panel p-1 elevation-md data-[state=open]:animate-in data-[state=open]:fade-in-0"
          >
            {items.map((item) => (
              <DropdownMenu.Item
                key={item.key}
                disabled={item.disabled}
                onSelect={item.onSelect}
                className={cn(
                  itemClass,
                  'cursor-pointer data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 data-[highlighted]:bg-app',
                  item.danger ? 'text-danger' : 'text-fg [&_svg]:text-muted',
                )}
              >
                {item.icon}
                {item.label}
              </DropdownMenu.Item>
            ))}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    );
  }

  return (
    <>
      <IconButton
        aria-label={label}
        size={size}
        className={triggerClassName}
        onClick={() => setOpen(true)}
      >
        <EllipsisVertical />
      </IconButton>
      <Sheet open={open} onOpenChange={setOpen} title={label} hideTitle>
        <ul className="-mx-2 flex flex-col">
          {items.map((item) => (
            <li key={item.key}>
              <button
                type="button"
                disabled={item.disabled}
                className={cn(
                  itemClass,
                  'active:bg-app disabled:opacity-50',
                  item.danger ? 'text-danger' : 'text-fg [&_svg]:text-muted',
                )}
                onClick={() => {
                  setOpen(false);
                  // Se ejecuta después de cerrar para no superponer dos paneles.
                  window.setTimeout(item.onSelect, 0);
                }}
              >
                {item.icon}
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </Sheet>
    </>
  );
}

// Clic derecho sobre una fila abre su menú "⋯" (solo desktop; en mobile se deja el
// comportamiento del sistema).
export function useContextMenu(): {
  open: boolean;
  setOpen: (open: boolean) => void;
  onContextMenu: (event: MouseEvent<HTMLElement>) => void;
} {
  const isSidebarLayout = useIsSidebarLayout();
  const [open, setOpen] = useState(false);
  return {
    open,
    setOpen,
    onContextMenu: (event) => {
      if (!isSidebarLayout) return;
      // Se respeta el menú del navegador sobre links externos, campos y texto seleccionado.
      const target = event.target as HTMLElement;
      if (target.closest('a[target="_blank"], input, textarea')) return;
      if (window.getSelection()?.isCollapsed === false) return;
      event.preventDefault();
      setOpen(true);
    },
  };
}
