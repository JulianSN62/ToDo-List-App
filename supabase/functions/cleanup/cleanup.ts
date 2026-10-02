// Limpieza diaria (spec 8.4). Lógica sin dependencias de Deno ni de supabase-js,
// para poder probarla con Vitest; index.ts la conecta con Supabase.
//
// Orden: primero se borran los archivos de Storage y después las filas. Si falla
// Storage, no se borra ninguna fila y todo se reintenta en la próxima ejecución
// (borrar un archivo que ya no existe no es un error).

export interface CleanupDeps {
  /** Rutas en Storage de los archivos que se van a purgar (función SQL cleanup_storage_paths). */
  storagePaths(now: string): Promise<unknown>;
  /** Borra una tanda de archivos; debe lanzar un error si falla. */
  removeFiles(paths: string[]): Promise<void>;
  /** Borra las filas (función SQL cleanup_purge) y devuelve las cantidades. */
  purge(now: string): Promise<unknown>;
}

export interface CleanupResult {
  files: number;
  tasks: number;
  folders: number;
  tags: number;
  attachments: number;
  reminders: number;
  reminderTimes: number;
}

export const STORAGE_BATCH_SIZE = 100;

const COUNT_KEYS = [
  'tasks',
  'folders',
  'tags',
  'attachments',
  'reminders',
  'reminderTimes',
] as const;

export function chunk<T>(items: readonly T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    batches.push(items.slice(index, index + size));
  }
  return batches;
}

// Solo cantidades: nunca contenido de tareas.
export function toCounts(value: unknown): Omit<CleanupResult, 'files'> {
  const source = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const read = (key: string) => {
    const count = source[key];
    return typeof count === 'number' && Number.isFinite(count) ? count : 0;
  };
  return Object.fromEntries(COUNT_KEYS.map((key) => [key, read(key)])) as Omit<
    CleanupResult,
    'files'
  >;
}

export function toStoragePaths(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [
    ...new Set(value.filter((path): path is string => typeof path === 'string' && path !== '')),
  ];
}

export async function runCleanup(
  deps: CleanupDeps,
  now: Date = new Date(),
): Promise<CleanupResult> {
  // El mismo instante para elegir archivos y filas: así se purga exactamente lo mismo.
  const at = now.toISOString();
  const paths = toStoragePaths(await deps.storagePaths(at));
  for (const batch of chunk(paths, STORAGE_BATCH_SIZE)) {
    await deps.removeFiles(batch);
  }
  const counts = toCounts(await deps.purge(at));
  return { files: paths.length, ...counts };
}
