import type { ColorToken } from '@/lib/colors';
import { nowIso } from '@/lib/dates';
import { newId } from '@/lib/ids';
import { findTagByName } from '@/lib/tags';
import { normalizeTagName } from '@/lib/validation';
import { requireUserId } from '../currentUser';
import { getDb } from '../db';

// Escrituras de etiquetas (globales). El nombre es único sin distinguir mayúsculas.

export class TagNameTakenError extends Error {
  constructor() {
    super('Ya existe una etiqueta con ese nombre');
    this.name = 'TagNameTakenError';
  }
}

type Queryable = {
  getAll: <T>(sql: string, params?: unknown[]) => Promise<T[]>;
};

async function activeTags(query: Queryable): Promise<{ id: string; name: string }[]> {
  return query.getAll<{ id: string; name: string }>(
    'SELECT id, name FROM tags WHERE deleted_at IS NULL',
  );
}

export interface TagInput {
  name: string;
  color: ColorToken | null;
}

export const tagRepo = {
  async create(input: TagInput): Promise<string> {
    const name = normalizeTagName(input.name);
    if (!name) throw new Error('Nombre de etiqueta inválido');
    const id = newId();
    const ownerId = requireUserId();
    const now = nowIso();
    await getDb().writeTransaction(async (tx) => {
      if (findTagByName(await activeTags(tx), name)) throw new TagNameTakenError();
      await tx.execute(
        `INSERT INTO tags (id, owner_id, name, color, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, ownerId, name, input.color, now, now],
      );
    });
    return id;
  },

  async update(id: string, input: TagInput): Promise<void> {
    const name = normalizeTagName(input.name);
    if (!name) throw new Error('Nombre de etiqueta inválido');
    await getDb().writeTransaction(async (tx) => {
      if (findTagByName(await activeTags(tx), name, id)) throw new TagNameTakenError();
      await tx.execute('UPDATE tags SET name = ?, color = ?, updated_at = ? WHERE id = ?', [
        name,
        input.color,
        nowIso(),
        id,
      ]);
    });
  },

  // Cantidad de tareas (no eliminadas) que tienen la etiqueta (para la confirmación).
  async countTasks(id: string): Promise<number> {
    const row = await getDb().get<{ total: number }>(
      `SELECT COUNT(DISTINCT tt.task_id) AS total
         FROM task_tags tt
         JOIN tasks t ON t.id = tt.task_id AND t.deleted_at IS NULL
        WHERE tt.tag_id = ?`,
      [id],
    );
    return row.total;
  },

  // Se quita de todas las tareas y se marca como eliminada (spec 6.5).
  async remove(id: string): Promise<void> {
    const now = nowIso();
    await getDb().writeTransaction(async (tx) => {
      await tx.execute('DELETE FROM task_tags WHERE tag_id = ?', [id]);
      await tx.execute('UPDATE tags SET deleted_at = ?, updated_at = ? WHERE id = ?', [
        now,
        now,
        id,
      ]);
    });
  },
};
