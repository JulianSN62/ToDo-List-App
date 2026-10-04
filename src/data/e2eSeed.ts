import { generateNKeysBetween } from 'fractional-indexing';
import { nowIso } from '@/lib/dates';
import { newId } from '@/lib/ids';
import { requireUserId } from './currentUser';
import { getDb } from './db';

// Solo para los tests E2E (build en modo "e2e"): carga muchos datos de una vez para
// probar listas largas. El build de producción no incluye este archivo.

export interface SeedResult {
  /** Carpeta con todas las tareas. */
  bigFolderId: string;
}

async function seed({ folders, tasks }: { folders: number; tasks: number }): Promise<SeedResult> {
  const ownerId = requireUserId();
  const now = nowIso();
  const bigFolderId = newId();
  // Una carpeta grande en la raíz y el resto repartido en un árbol de 3 niveles.
  const folderRows: [string, string | null, string][] = [[bigFolderId, null, 'Carpeta grande']];
  const parents: (string | null)[] = [null];
  for (let index = 1; index < folders; index++) {
    const parentId = parents[Math.floor((index - 1) / 10)] ?? null;
    const id = newId();
    folderRows.push([id, parentId, `Carpeta ${index}`]);
    if (parents.length < 40) parents.push(id);
  }
  const folderKeys = generateNKeysBetween(null, null, folderRows.length);
  const taskKeys = generateNKeysBetween(null, null, tasks);

  await getDb().writeTransaction(async (tx) => {
    for (const [index, [id, parentId, name]] of folderRows.entries()) {
      await tx.execute(
        `INSERT INTO folders (id, owner_id, parent_id, name, color, position, created_at, updated_at)
         VALUES (?, ?, ?, ?, NULL, ?, ?, ?)`,
        [id, ownerId, parentId, name, folderKeys[index], now, now],
      );
    }
    for (let index = 0; index < tasks; index++) {
      await tx.execute(
        `INSERT INTO tasks (id, owner_id, folder_id, title, is_priority, position, is_done,
                            is_pinned, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?, ?)`,
        [
          newId(),
          ownerId,
          bigFolderId,
          `Tarea ${index + 1}`,
          index % 25 === 0 ? 1 : 0,
          taskKeys[index],
          now,
          now,
        ],
      );
    }
  });
  return { bigFolderId };
}

export function installE2eSeed(): void {
  Object.assign(window, { __todoE2eSeed: seed });
}
