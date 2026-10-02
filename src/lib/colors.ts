// Paleta curada de colores elegibles por el usuario (carpetas, tareas, etiquetas).
// Se guarda el nombre del token, nunca el hex: así se adapta a tema claro y oscuro.

export const COLOR_TOKENS = [
  'slate',
  'red',
  'orange',
  'amber',
  'green',
  'teal',
  'blue',
  'indigo',
  'purple',
  'pink',
] as const;

export type ColorToken = (typeof COLOR_TOKENS)[number];

export function isColorToken(value: unknown): value is ColorToken {
  return typeof value === 'string' && (COLOR_TOKENS as readonly string[]).includes(value);
}

// Convierte un valor guardado en token válido; cualquier otra cosa se ignora.
export function toColorToken(value: string | null | undefined): ColorToken | null {
  return isColorToken(value) ? value : null;
}

// Referencia a la variable CSS del token (definida en tokens.css).
export function colorVar(token: ColorToken): string {
  return `var(--token-${token})`;
}

// Versión translúcida del token (fondo de los chips de etiqueta). Sigue al tema claro u oscuro.
export function colorTint(token: ColorToken, percent = 12): string {
  return `color-mix(in srgb, ${colorVar(token)} ${percent}%, transparent)`;
}
