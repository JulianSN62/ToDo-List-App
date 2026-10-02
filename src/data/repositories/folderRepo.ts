import type { ColorToken } from '@/lib/colors';
import { nowIso, parseInstant } from '@/lib/dates';
import { newId } from '@/lib/ids';
import { keyBetween } from '@/lib/ordering';
import { buildChildrenMap, canMoveFolder, getDescendantIds } from '@/lib/tree';
import { normalizeFolderName } from '@/lib/validation';
import { requireUserId } from '../currentUser';
import { getDb } from '../db';

// Escrituras de carpetas. Todo se guarda primero en la base local y se sincroniza después.

interface FolderNode {
  id: string;
  parent_id: string | null;
  position: string;
}

async function lastPositionIn(
  query: { getOptional: <T>(sql: string, params?: unknown[]) => Promise<T | null> },
  parentId: string | null,
): Promise<string | null> {
  const last = await query.getOptional<{ position: string }>(
    `SELECT position FROM folders
      WHERE deleted_at IS NULL AND parent_id IS ?
      ORDER BY position DESC, id DESC LIMIT 1`,
    [parentId],
  );
  return last?.position ?? null;
}

async function loadTree() {
  const rows = await getDb().getAll<FolderNode>(
    'SELECT id, parent_id, position FROM folders WHERE deleted_at IS NULL',
  );
  return buildChildrenMap(
    rows.map((row) => ({ id: row.id, parentId: row.parent_id, position: row.position })),
  );
}

export interface DeletedFolderSnapshot {
  deletedAt: string;
  folderIds: string[];
}

export const folderRepo = {
  async create(input: {
    parentId: string | null;
    name: string;
    color: ColorToken | null;
  }): Promise<string> {
    const name = normalizeFolderName(input.name);
    if (!name) throw new Error('Nombre de carpeta inválido');
    const id = newId();
    const ownerId = requireUserId();
    const now = nowIso();
    await getDb().writeTransaction(async (tx) => {
      const position = keyBetween(await lastPositionIn(tx, input.parentId), null);
      await tx.execute(
        `INSERT INTO folders (id, owner_id, parent_id, name, color, position, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, ownerId, input.parentId, name, input.color, position, now, now],
      );
    });
    return id;
  },

  async update(id: string, input: { name: string; color: ColorToken | null }): Promise<void> {
    const name = normalizeFolderName(input.name);
    if (!name) throw new Error('Nombre de carpeta inválido');
    await getDb().execute('UPDATE folders SET name = ?, color = ?, updated_at = ? WHERE id = ?', [
      name,
      input.color,
      nowIso(),
      id,
    ]);
  },

  // Mueve la carpeta (y todo su contenido) a otra carpeta o a la raíz, al final de la lista.
  async move(id: string, newParentId: string | null): Promise<void> {
    const children = await loadTree();
    if (!canMoveFolder(id, newParentId, children)) {
      throw new Error('Movimiento inválido');
    }
    await getDb().writeTransaction(async (tx) => {
      const position = keyBetween(await lastPositionIn(tx, newParentId), null);
      await tx.execute(
        'UPDATE folders SET parent_id = ?, position = ?, updated_at = ? WHERE id = ?',
        [newParentId, position, nowIso(), id],
      );
    });
  },

  async setPosition(id: string, position: string): Promise<void> {
    await getDb().execute('UPDATE folders SET position = ?, updated_at = ? WHERE id = ?', [
      position,
      nowIso(),
      id,
    ]);
  },

  // Cantidad de subcarpetas y tareas que se borrarían (para la confirmación).
  async countContents(id: string): Promise<{ folders: number; tasks: number }> {
    const children = await loadTree();
    const descendants = [...getDescendantIds(id, children)];
    const row = await getDb().get<{ total: number }>(
      `SELECT COUNT(*) AS total FROM tasks
        WHERE deleted_at IS NULL AND folder_id IN (SELECT value FROM json_each(?))`,
      [JSON.stringify([id, ...descendants])],
    );
    return { folders: descendants.length, tasks: row.total };
  },

  // Borrado lógico de la carpeta, sus subcarpetas y sus tareas, todos con el mismo deleted_at.
  async softDelete(id: string): Promise<DeletedFolderSnapshot> {
    const children = await loadTree();
    const folderIds = [id, ...getDescendantIds(id, children)];
    const deletedAt = nowIso();
    const idsJson = JSON.stringify(folderIds);
    await getDb().writeTransaction(async (tx) => {
      await tx.execute(
        `UPDATE tasks SET deleted_at = ?, updated_at = ?
          WHERE deleted_at IS NULL AND folder_id IN (SELECT value FROM json_each(?))`,
        [deletedAt, deletedAt, idsJson],
      );
      await tx.execute(
        `UPDATE folders SET deleted_at = ?, updated_at = ?
          WHERE deleted_at IS NULL AND id IN (SELECT value FROM json_each(?))`,
        [deletedAt, deletedAt, idsJson],
      );
    });
    return { deletedAt, folderIds };
  },

  // Deshacer: restaura solo lo que se borró en esa misma operación (mismo deleted_at exacto).
  // La comparación se hace por instante y no por texto, porque al sincronizar
  // el servidor puede devolver la fecha con otro formato.
  async restore(snapshot: DeletedFolderSnapshot): Promise<void> {
    const target = parseInstant(snapshot.deletedAt)?.getTime();
    if (target === undefined) return;
    const idsJson = JSON.stringify(snapshot.folderIds);
    const matches = (row: { deleted_at: string | null }) =>
      parseInstant(row.deleted_at)?.getTime() === target;
    const now = nowIso();

    await getDb().writeTransaction(async (tx) => {
      const folders = await tx.getAll<{ id: string; deleted_at: string | null }>(
        `SELECT id, deleted_at FROM folders
          WHERE deleted_at IS NOT NULL AND id IN (SELECT value FROM json_each(?))`,
        [idsJson],
      );
      const tasks = await tx.getAll<{ id: string; deleted_at: string | null }>(
        `SELECT id, deleted_at FROM tasks
          WHERE deleted_at IS NOT NULL AND folder_id IN (SELECT value FROM json_each(?))`,
        [idsJson],
      );
      const folderIds = folders.filter(matches).map((row) => row.id);
      const taskIds = tasks.filter(matches).map((row) => row.id);
      if (folderIds.length > 0) {
        await tx.execute(
          `UPDATE folders SET deleted_at = NULL, updated_at = ?
            WHERE id IN (SELECT value FROM json_each(?))`,
          [now, JSON.stringify(folderIds)],
        );
      }
      if (taskIds.length > 0) {
        await tx.execute(
          `UPDATE tasks SET deleted_at = NULL, updated_at = ?
            WHERE id IN (SELECT value FROM json_each(?))`,
          [now, JSON.stringify(taskIds)],
        );
      }
    });
  },
};
