import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DraggableAttributes,
  type DraggableSyntheticListeners,
  type Modifier,
  type UniqueIdentifier,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { es } from '@/i18n/es';
import { cn } from '@/lib/cn';

// Lista reordenable con arrastrar y soltar. Se arrastra SOLO desde el asa
// (así no choca con el scroll vertical) y también funciona con teclado.

export interface DragHandleBinding {
  attributes: DraggableAttributes;
  listeners: DraggableSyntheticListeners;
  bindActivator: (element: HTMLElement | null) => void;
  isDragging: boolean;
}

const restrictToVerticalAxis: Modifier = ({ transform }) => ({ ...transform, x: 0 });

// Constantes fuera del componente: si cambian en cada render, dnd-kit rehace los
// listeners de todas las filas y las filas memorizadas se vuelven a dibujar.
const MODIFIERS = [restrictToVerticalAxis];
const POINTER_OPTIONS = { activationConstraint: { distance: 4 } };
const KEYBOARD_OPTIONS = { coordinateGetter: sortableKeyboardCoordinates };
const SCREEN_READER_INSTRUCTIONS = { draggable: es.dnd.instructions };

function SortableItem({
  id,
  children,
}: {
  id: string;
  children: (handle: DragHandleBinding) => ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });
  // Mismo objeto mientras no cambie nada: las filas memorizadas no se vuelven a dibujar.
  const handle = useMemo(
    () => ({ attributes, listeners, bindActivator: setActivatorNodeRef, isDragging }),
    [attributes, listeners, setActivatorNodeRef, isDragging],
  );
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn('relative', isDragging && 'z-10 bg-panel elevation-md')}
    >
      {children(handle)}
    </li>
  );
}

// Anuncios para lectores de pantalla con el nombre del elemento y su posición. Leen la
// lista más reciente al ocurrir (así el objeto no cambia entre renders).
function useAnnouncements<T extends { id: string }>(
  items: readonly T[],
  itemLabel: (item: T) => string,
): Announcements {
  const latest = useRef({ items, itemLabel });
  useEffect(() => {
    latest.current = { items, itemLabel };
  });
  return useMemo(() => {
    const describe = (id: UniqueIdentifier) => {
      const { items: list, itemLabel: label } = latest.current;
      const index = list.findIndex((item) => item.id === String(id));
      const item = list[index];
      return { name: item ? label(item) : '', position: index + 1, total: list.length };
    };
    return {
      onDragStart: ({ active }) => es.dnd.picked(describe(active.id).name),
      onDragOver: ({ active, over }) => {
        if (!over) return undefined;
        const target = describe(over.id);
        return es.dnd.moved(describe(active.id).name, target.position, target.total);
      },
      onDragEnd: ({ active, over }) => {
        const name = describe(active.id).name;
        if (!over) return es.dnd.cancelled(name);
        const target = describe(over.id);
        return es.dnd.dropped(name, target.position, target.total);
      },
      onDragCancel: ({ active }) => es.dnd.cancelled(describe(active.id).name),
    };
  }, []);
}

export function SortableList<T extends { id: string }>({
  items,
  itemLabel,
  onReorder,
  renderItem,
  className,
}: {
  items: readonly T[];
  /** Nombre del elemento para los anuncios de lectores de pantalla. */
  itemLabel: (item: T) => string;
  onReorder: (activeId: string, overId: string) => void;
  renderItem: (item: T, handle: DragHandleBinding) => ReactNode;
  className?: string;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, POINTER_OPTIONS),
    useSensor(KeyboardSensor, KEYBOARD_OPTIONS),
  );
  const ids = useMemo(() => items.map((item) => item.id), [items]);
  const announcements = useAnnouncements(items, itemLabel);
  const accessibility = useMemo(
    () => ({ screenReaderInstructions: SCREEN_READER_INSTRUCTIONS, announcements }),
    [announcements],
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={MODIFIERS}
      onDragEnd={({ active, over }) => {
        if (over && active.id !== over.id) onReorder(String(active.id), String(over.id));
      }}
      accessibility={accessibility}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <ul className={className}>
          {items.map((item) => (
            <SortableItem key={item.id} id={item.id}>
              {(handle) => renderItem(item, handle)}
            </SortableItem>
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

// Asa de arrastre (6 puntos, 20px) con área táctil cómoda.
export function DragHandle({
  handle: { attributes, listeners, bindActivator },
  label,
}: {
  handle: DragHandleBinding;
  label: string;
}) {
  return (
    <button
      type="button"
      ref={bindActivator}
      aria-label={label}
      className="flex h-12 w-8 shrink-0 cursor-grab touch-none items-center justify-center text-muted active:cursor-grabbing"
      {...attributes}
      {...listeners}
    >
      <GripVertical aria-hidden className="size-5" />
    </button>
  );
}
