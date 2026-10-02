// Atajos de teclado de desktop (spec 11.7): N nueva tarea o carpeta, "/" o Ctrl+K buscar.
// Esc y Enter no se manejan acá: los resuelven las ventanas y los formularios.
// Las teclas se reconocen por el carácter (event.key), así "/" funciona igual con
// teclado español (Shift+7) que con teclado inglés.

export type ShortcutAction = 'newItem' | 'search';

export interface ShortcutKeyEvent {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  repeat: boolean;
  isComposing: boolean;
}

export interface ShortcutContext {
  /** El foco está en un campo de texto: las letras se escriben, no son atajos. */
  typing: boolean;
  /** Hay una ventana, menú o panel abierto: los atajos no deben actuar detrás. */
  overlayOpen: boolean;
}

export interface ShortcutTarget {
  tagName?: string;
  isContentEditable?: boolean;
  type?: string;
}

const NON_TEXT_INPUTS = new Set([
  'button',
  'checkbox',
  'color',
  'file',
  'image',
  'radio',
  'range',
  'reset',
  'submit',
]);

export function isTypingTarget(target: ShortcutTarget | null | undefined): boolean {
  if (!target) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName?.toUpperCase();
  if (tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (tag === 'INPUT') return !NON_TEXT_INPUTS.has((target.type ?? 'text').toLowerCase());
  return false;
}

export function matchShortcut(
  event: ShortcutKeyEvent,
  context: ShortcutContext,
): ShortcutAction | null {
  if (event.isComposing || event.repeat || context.overlayOpen) return null;

  // Ctrl+K (⌘+K en Mac) funciona también desde un campo: no escribe ningún carácter.
  if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === 'k') {
    return 'search';
  }

  if (context.typing || event.ctrlKey || event.metaKey || event.altKey) return null;
  if (event.key === '/') return 'search';
  if (event.key === 'n' || event.key === 'N') return 'newItem';
  return null;
}
