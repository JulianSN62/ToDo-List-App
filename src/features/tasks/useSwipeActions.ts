import { useRef, useState, type PointerEvent } from 'react';

// Gestos de deslizar en una fila (solo táctil):
// hacia la derecha completa, hacia la izquierda elimina.
// No arranca en los bordes de la pantalla para no chocar con el gesto "atrás" de Android.

const EDGE_GUARD_PX = 24;
const DECIDE_PX = 10;
const TRIGGER_RATIO = 0.35;

interface Gesture {
  pointerId: number;
  startX: number;
  startY: number;
  horizontal: boolean | null;
  width: number;
}

export function useSwipeActions({
  enabled,
  onSwipeRight,
  onSwipeLeft,
}: {
  enabled: boolean;
  onSwipeRight: () => void;
  onSwipeLeft: () => void;
}) {
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const gesture = useRef<Gesture | null>(null);
  // Evita que el "click" final de un deslizamiento abra el detalle.
  const suppressClick = useRef(false);

  function reset() {
    gesture.current = null;
    setDragging(false);
    setOffset(0);
  }

  const handlers = {
    onPointerDown(event: PointerEvent<HTMLElement>) {
      suppressClick.current = false;
      if (!enabled || event.pointerType === 'mouse') return;
      const x = event.clientX;
      if (x < EDGE_GUARD_PX || x > window.innerWidth - EDGE_GUARD_PX) return;
      gesture.current = {
        pointerId: event.pointerId,
        startX: x,
        startY: event.clientY,
        horizontal: null,
        width: event.currentTarget.getBoundingClientRect().width,
      };
    },
    onPointerMove(event: PointerEvent<HTMLElement>) {
      const current = gesture.current;
      if (!current || current.pointerId !== event.pointerId) return;
      const dx = event.clientX - current.startX;
      const dy = event.clientY - current.startY;
      if (current.horizontal === null) {
        if (Math.abs(dx) > DECIDE_PX && Math.abs(dx) > Math.abs(dy) * 1.5) {
          current.horizontal = true;
          event.currentTarget.setPointerCapture(event.pointerId);
          setDragging(true);
        } else if (Math.abs(dy) > DECIDE_PX) {
          gesture.current = null;
          return;
        } else {
          return;
        }
      }
      setOffset(dx);
    },
    onPointerUp(event: PointerEvent<HTMLElement>) {
      const current = gesture.current;
      if (!current || current.pointerId !== event.pointerId) return;
      if (current.horizontal) {
        suppressClick.current = true;
        const dx = event.clientX - current.startX;
        if (dx > current.width * TRIGGER_RATIO) onSwipeRight();
        else if (dx < -current.width * TRIGGER_RATIO) onSwipeLeft();
      }
      reset();
    },
    onPointerCancel() {
      reset();
    },
    onClickCapture(event: { preventDefault: () => void; stopPropagation: () => void }) {
      if (suppressClick.current) {
        event.preventDefault();
        event.stopPropagation();
        suppressClick.current = false;
      }
    },
  };

  return { offset, dragging, handlers };
}
