import { Dialog as DialogPrimitive } from 'radix-ui';
import type { ReactNode } from 'react';
import { Drawer } from 'vaul';
import { cn } from '@/lib/cn';
import { useBackHandler } from './backStack';
import { useIsSidebarLayout } from './useMediaQuery';

// Panel responsive: en mobile sube desde abajo (bottom sheet), en desktop es un modal centrado.

export interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** Oculta visualmente el título (sigue disponible para lectores de pantalla). */
  hideTitle?: boolean;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  /** "tall": ocupa casi toda la pantalla en mobile (detalle de tarea). */
  size?: 'auto' | 'tall';
  desktopWidth?: 'sm' | 'md';
  headerAction?: ReactNode;
  /** false: en mobile no se cierra deslizando ni tocando afuera (por ejemplo, con cambios sin guardar). */
  dismissible?: boolean;
  /** El contenido maneja su propio scroll y pie (formularios con estado propio). Usar SheetBody y SheetFooter. */
  customBody?: boolean;
}

// Área con scroll y pie fijo para usar con customBody (mismos márgenes que el panel estándar).
export function SheetBody({ children }: { children: ReactNode }) {
  return <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-6">{children}</div>;
}

export function SheetFooter({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-2 border-t border-line px-4 py-3 md:justify-end md:px-6 md:py-4">
      {children}
    </div>
  );
}

function SheetHeader({
  title,
  hideTitle,
  description,
  headerAction,
  TitleComponent,
  DescriptionComponent,
}: Pick<SheetProps, 'title' | 'hideTitle' | 'description' | 'headerAction'> & {
  TitleComponent: typeof DialogPrimitive.Title;
  DescriptionComponent: typeof DialogPrimitive.Description;
}) {
  return (
    <div
      className={cn('flex items-start gap-2 px-4 pt-4', hideTitle && !headerAction && 'sr-only')}
    >
      <div className="min-w-0 flex-1">
        <TitleComponent
          className={cn('text-title-sm font-semibold text-fg', hideTitle && 'sr-only')}
        >
          {title}
        </TitleComponent>
        {description ? (
          <DescriptionComponent className="mt-1 text-body-sm text-muted">
            {description}
          </DescriptionComponent>
        ) : (
          <DescriptionComponent className="sr-only">{title}</DescriptionComponent>
        )}
      </div>
      {headerAction}
    </div>
  );
}

export function Sheet({
  open,
  onOpenChange,
  title,
  hideTitle,
  description,
  children,
  footer,
  size = 'auto',
  desktopWidth = 'sm',
  headerAction,
  dismissible = true,
  customBody = false,
}: SheetProps) {
  const isSidebarLayout = useIsSidebarLayout();
  useBackHandler(open, () => onOpenChange(false));

  const body = customBody ? (
    children
  ) : (
    <>
      {children ? <SheetBody>{children}</SheetBody> : <div className="h-4" />}
      {footer ? <SheetFooter>{footer}</SheetFooter> : null}
    </>
  );

  if (isSidebarLayout) {
    return (
      <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-scrim data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
          <DialogPrimitive.Content
            // Tocar un aviso ("Deshacer") no cierra la ventana.
            onInteractOutside={(event) => {
              const target = event.target;
              if (target instanceof Element && target.closest('[data-sonner-toaster]')) {
                event.preventDefault();
              }
            }}
            className={cn(
              'fixed top-1/2 left-1/2 z-50 flex max-h-[85dvh] w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col rounded-md border border-line bg-panel elevation-lg outline-none',
              'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
              desktopWidth === 'sm' ? 'max-w-[420px]' : 'max-w-[600px]',
            )}
          >
            <SheetHeader
              title={title}
              hideTitle={hideTitle}
              description={description}
              headerAction={headerAction}
              TitleComponent={DialogPrimitive.Title}
              DescriptionComponent={DialogPrimitive.Description}
            />
            {body}
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    );
  }

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} dismissible={dismissible}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-scrim" />
        <Drawer.Content
          className={cn(
            'fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-md bg-panel pb-safe elevation-lg outline-none',
            size === 'tall' ? 'h-[90dvh]' : 'max-h-[90dvh]',
          )}
        >
          <div aria-hidden className="mx-auto mt-2 h-1 w-8 shrink-0 rounded-full bg-line" />
          <SheetHeader
            title={title}
            hideTitle={hideTitle}
            description={description}
            headerAction={headerAction}
            TitleComponent={Drawer.Title}
            DescriptionComponent={Drawer.Description}
          />
          {body}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
