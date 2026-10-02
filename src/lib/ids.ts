// IDs UUID v4 generados en el cliente: permiten crear datos sin conexión.
export function newId(): string {
  return crypto.randomUUID();
}

function toUuid(bytes: Uint8Array): string {
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

// ID fijo de la relación tarea-etiqueta, derivado de ambos ids (SHA-256 con formato UUID).
// Si dos dispositivos agregan la misma etiqueta a la misma tarea sin conexión,
// generan la misma fila y no se duplica al sincronizar.
export async function taskTagId(taskId: string, tagId: string): Promise<string> {
  const data = new TextEncoder().encode(`task_tag:${taskId}:${tagId}`);
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', data));
  const bytes = digest.slice(0, 16);
  // Versión 8 (UUID personalizado) y variante RFC, para que sea un UUID con formato válido.
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x80;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  return toUuid(bytes);
}
