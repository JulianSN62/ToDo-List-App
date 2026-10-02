import { useEffect, useRef } from 'react';

// Pila de acciones para el botón "atrás" de Android: cada panel abierto registra
// cómo cerrarse. El botón atrás ejecuta siempre el último registrado.

const handlers: Array<{ id: number; run: () => void }> = [];
let nextId = 1;

export function pushBackHandler(run: () => void): () => void {
  const entry = { id: nextId++, run };
  handlers.push(entry);
  return () => {
    const index = handlers.findIndex((item) => item.id === entry.id);
    if (index !== -1) handlers.splice(index, 1);
  };
}

// Devuelve true si algún panel consumió el botón atrás.
export function runBackHandler(): boolean {
  const top = handlers[handlers.length - 1];
  if (!top) return false;
  top.run();
  return true;
}

// Registra el handler mientras "active" sea true.
export function useBackHandler(active: boolean, handler: () => void): void {
  const handlerRef = useRef(handler);
  useEffect(() => {
    handlerRef.current = handler;
  });
  useEffect(() => {
    if (!active) return;
    return pushBackHandler(() => handlerRef.current());
  }, [active]);
}
