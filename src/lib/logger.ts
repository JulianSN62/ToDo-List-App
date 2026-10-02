// Logger mínimo de la app.
// Regla de seguridad: nunca pasarle contenido de tareas, tokens, emails ni códigos OTP.
// Solo mensajes fijos y metadatos técnicos (nombre de tabla, código de error, etc.).

type Meta = Record<string, string | number | boolean | null | undefined>;

function format(message: string, meta?: Meta): string {
  if (!meta) return `[todo] ${message}`;
  return `[todo] ${message} ${JSON.stringify(meta)}`;
}

export const logger = {
  warn(message: string, meta?: Meta): void {
    console.warn(format(message, meta));
  },
  error(message: string, meta?: Meta): void {
    console.error(format(message, meta));
  },
};

// Extrae solo datos técnicos seguros de un error desconocido.
export function errorMeta(error: unknown): Meta {
  if (error && typeof error === 'object') {
    const candidate = error as { name?: unknown; code?: unknown; status?: unknown };
    return {
      name: typeof candidate.name === 'string' ? candidate.name : undefined,
      code: typeof candidate.code === 'string' ? candidate.code : undefined,
      status: typeof candidate.status === 'number' ? candidate.status : undefined,
    };
  }
  return { name: typeof error };
}
