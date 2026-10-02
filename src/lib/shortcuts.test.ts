import { describe, expect, it } from 'vitest';
import { isTypingTarget, matchShortcut, type ShortcutKeyEvent } from './shortcuts';

function key(value: string, extra: Partial<ShortcutKeyEvent> = {}): ShortcutKeyEvent {
  return {
    key: value,
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    repeat: false,
    isComposing: false,
    ...extra,
  };
}

const idle = { typing: false, overlayOpen: false };

describe('atajos de teclado', () => {
  it('N crea, / y Ctrl+K buscan', () => {
    expect(matchShortcut(key('n'), idle)).toBe('newItem');
    expect(matchShortcut(key('N'), idle)).toBe('newItem');
    expect(matchShortcut(key('/'), idle)).toBe('search');
    expect(matchShortcut(key('k', { ctrlKey: true }), idle)).toBe('search');
    expect(matchShortcut(key('K', { metaKey: true }), idle)).toBe('search');
  });

  it('mientras se escribe solo vale Ctrl+K', () => {
    const typing = { typing: true, overlayOpen: false };
    expect(matchShortcut(key('n'), typing)).toBeNull();
    expect(matchShortcut(key('/'), typing)).toBeNull();
    expect(matchShortcut(key('k', { ctrlKey: true }), typing)).toBe('search');
  });

  it('con una ventana o menú abierto no hace nada', () => {
    const overlay = { typing: false, overlayOpen: true };
    expect(matchShortcut(key('n'), overlay)).toBeNull();
    expect(matchShortcut(key('k', { ctrlKey: true }), overlay)).toBeNull();
  });

  it('ignora modificadores, repeticiones y composición de texto', () => {
    expect(matchShortcut(key('n', { ctrlKey: true }), idle)).toBeNull();
    expect(matchShortcut(key('n', { altKey: true }), idle)).toBeNull();
    // AltGr en Windows se informa como Ctrl+Alt.
    expect(matchShortcut(key('k', { ctrlKey: true, altKey: true }), idle)).toBeNull();
    expect(matchShortcut(key('n', { repeat: true }), idle)).toBeNull();
    expect(matchShortcut(key('n', { isComposing: true }), idle)).toBeNull();
    expect(matchShortcut(key('x'), idle)).toBeNull();
  });

  it('detecta campos de texto', () => {
    expect(isTypingTarget({ tagName: 'INPUT', type: 'text' })).toBe(true);
    expect(isTypingTarget({ tagName: 'input', type: 'search' })).toBe(true);
    expect(isTypingTarget({ tagName: 'INPUT' })).toBe(true);
    expect(isTypingTarget({ tagName: 'TEXTAREA' })).toBe(true);
    expect(isTypingTarget({ tagName: 'DIV', isContentEditable: true })).toBe(true);
    expect(isTypingTarget({ tagName: 'INPUT', type: 'checkbox' })).toBe(false);
    expect(isTypingTarget({ tagName: 'BUTTON' })).toBe(false);
    expect(isTypingTarget(null)).toBe(false);
  });
});
