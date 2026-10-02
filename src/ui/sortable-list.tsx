import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DraggableAttributes,
  type DraggableSyntheticListeners,
  type Modifier,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import type { ReactNode } from 'react';
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
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn('relative', isDragging && 'z-10 bg-panel elevation-md')}
    >
      {children({ attributes, listeners, bindActivator: setActivatorNodeRef, isDragging })}
    </li>
  );
}

export function SortableList<T extends { id: string }>({
  items,
  onReorder,
  renderItem,
  className,
}: {
  items: readonly T[];
  onReorder: (activeId: string, overId: string) => void;
  renderItem: (item: T, handle: DragHandleBinding) => ReactNode;
  className?: string;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis]}
      onDragEnd={({ active, over }) => {
        if (over && active.id !== over.id) onReorder(String(active.id), String(over.id));
      }}
      accessibility={{
        screenReaderInstructions: { draggable: es.dnd.instructions },
        announcements: {
          onDragStart: () => es.dnd.picked,
          onDragOver: () => es.dnd.moved,
          onDragEnd: () => es.dnd.dropped,
          onDragCancel: () => es.dnd.cancelled,
        },
      }}
    >
      <SortableContext items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
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
