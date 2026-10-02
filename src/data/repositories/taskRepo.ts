import type { Transaction } from '@powersync/web';
import type { ColorToken } from '@/lib/colors';
import { nowIso } from '@/lib/dates';
import { newId, taskTagId } from '@/lib/ids';
import { normalizeLinkLabel, normalizeLinkUrl } from '@/lib/links';
import { keyBetween } from '@/lib/ordering';
import { isRetentionExpired } from '@/lib/retention';
import { normalizeDescription, normalizeTitle } from '@/lib/validation';
import { localFiles } from '@/platform';
import { requireUserId } from '../currentUser';
import { getDb } from '../db';
import { boolToInt } from '../mappers';
import {
  discardStagedFiles,
  insertFileRows,
  lastAttachmentPosition,
  stageFiles,
  type NewFileInput,
} from './attachmentRepo';

// Escrituras de tareas. Solo el título es obligatorio.

type Queryable = {
  getOptional: <T>(sql: string, params?: unknown[]) => Promise<T | null>;
};

async function lastPositionInFolder(query: Queryable, folderId: string): Promise<string | null> {
  const last = await query.getOptional<{ position: string }>(
    `SELECT position FROM tasks
      WHERE deleted_at IS NULL AND folder_id = ?
      ORDER BY position DESC, id DESC LIMIT 1`,
    [folderId],
  );
  return last?.position ?? null;
}

export interface LinkInput {
  url: string;
  label: string | null;
}

export interface NewTaskInput {
  folderId: string;
  title: string;
  description?: string | null;
  dueDate?: string | null;
  isPriority?: boolean;
  color?: ColorToken | null;
  tagIds?: string[];
  links?: LinkInput[];
  files?: NewFileInput[];
}

export interface TaskPatch {
  title?: string;
  description?: string | null;
  dueDate?: string | null;
  isPriority?: boolean;
  color?: ColorToken | null;
}

// Cambios de la ventana de edición, aplicados juntos al tocar "Guardar".
export interface TaskEdits {
  patch?: TaskPatch;
  /** Carpeta nueva (la tarea queda al final), o null si no cambió. */
  folderId?: string | null;
  tags?: { add: string[]; remove: string[] };
  links?: { add: LinkInput[]; update: (LinkInput & { id: string })[]; remove: string[] };
  /** Archivos nuevos y los que se quitan (borrado lógico, como los links). */
  files?: { add: NewFileInput[]; remove: string[] };
}

// Arma el UPDATE con solo los campos indicados (así se sube solo lo que cambió).
function patchToSql(patch: TaskPatch): { sets: string[]; values: unknown[] } {
  const sets: string[] = [];
  const values: unknown[] = [];
  if (patch.title !== undefined) {
    const title = normalizeTitle(patch.title);
    if (!title) throw new Error('Título inválido');
    sets.push('title = ?');
    values.push(title);
  }
  if (patch.description !== undefined) {
    sets.push('description = ?');
    values.push(patch.description === null ? null : normalizeDescription(patch.description));
  }
  if (patch.dueDate !== undefined) {
    sets.push('due_date = ?');
    values.push(patch.dueDate);
  }
  if (patch.isPriority !== undefined) {
    sets.push('is_priority = ?');
    values.push(boolToInt(patch.isPriority));
  }
  if (patch.color !== undefined) {
    sets.push('color = ?');
    values.push(patch.color);
  }
  return { sets, values };
}

function validLink(link: LinkInput): LinkInput {
  const url = normalizeLinkUrl(link.url);
  if (!url) throw new Error('Link inválido');
  return { url, label: link.label === null ? null : normalizeLinkLabel(link.label) };
}

// Agrega links al final de los adjuntos de la tarea.
async function insertLinks(
  tx: Transaction,
  taskId: string,
  ownerId: string,
  links: readonly LinkInput[],
  now: string,
): Promise<void> {
  if (links.length === 0) return;
  let position = await lastAttachmentPosition(tx, taskId);
  for (const link of links) {
    const { url, label } = validLink(link);
    position = keyBetween(position, null);
    await tx.execute(
      `INSERT INTO attachments (id, owner_id, task_id, kind, label, url, position, created_at, updated_at)
       VALUES (?, ?, ?, 'link', ?, ?, ?, ?, ?)`,
      [newId(), ownerId, taskId, label, url, position, now, now],
    );
  }
}

// Asigna etiquetas con el id fijo de cada par (sin duplicados entre dispositivos).
async function insertTaskTags(
  tx: Transaction,
  taskId: string,
  ownerId: string,
  tags: readonly { tagId: string; id: string }[],
  now: string,
): Promise<void> {
  for (const { tagId, id } of tags) {
    const tagExists = await tx.getOptional<{ id: string }>(
      'SELECT id FROM tags WHERE id = ? AND deleted_at IS NULL',
      [tagId],
    );
    if (!tagExists) continue;
    const already = await tx.getOptional<{ id: string }>('SELECT id FROM task_tags WHERE id = ?', [
      id,
    ]);
    if (already) continue;
    await tx.execute(
      `INSERT INTO task_tags (id, owner_id, task_id, tag_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, ownerId, taskId, tagId, now, now],
    );
  }
}

async function withTaskTagIds(
  taskId: string,
  tagIds: readonly string[],
): Promise<{ tagId: string; id: string }[]> {
  const unique = [...new Set(tagIds)];
  return Promise.all(unique.map(async (tagId) => ({ tagId, id: await taskTagId(taskId, tagId) })));
}

export const taskRepo = {
  // Crea la tarea al final de la carpeta, con sus etiquetas, links y archivos.
  async create(input: NewTaskInput): Promise<string> {
    const title = normalizeTitle(input.title);
    if (!title) throw new Error('Título inválido');
    const id = newId();
    const ownerId = requireUserId();
    const now = nowIso();
    const links = (input.links ?? []).map(validLink);
    const tags = await withTaskTagIds(id, input.tagIds ?? []);
    // Los archivos se guardan en el dispositivo antes de crear las filas.
    const files = await stageFiles(ownerId, id, input.files ?? []);
    try {
      await getDb().writeTransaction(async (tx) => {
        const position = keyBetween(await lastPositionInFolder(tx, input.folderId), null);
        await tx.execute(
          `INSERT INTO tasks (id, owner_id, folder_id, title, description, due_date, is_priority,
                              color, position, is_done, is_pinned, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?)`,
          [
            id,
            ownerId,
            input.folderId,
            title,
            input.description ? normalizeDescription(input.description) : null,
            input.dueDate ?? null,
            boolToInt(input.isPriority ?? false),
            input.color ?? null,
            position,
            now,
            now,
          ],
        );
        await insertLinks(tx, id, ownerId, links, now);
        await insertFileRows(tx, id, ownerId, files, now);
        await insertTaskTags(tx, id, ownerId, tags, now);
      });
    } catch (error) {
      await discardStagedFiles(files);
      throw error;
    }
    return id;
  },

  // Actualiza solo los campos indicados (así se sube solo lo que cambió).
  async update(id: string, patch: TaskPatch): Promise<void> {
    const { sets, values } = patchToSql(patch);
    if (sets.length === 0) return;
    sets.push('updated_at = ?');
    values.push(nowIso(), id);
    await getDb().execute(`UPDATE tasks SET ${sets.join(', ')} WHERE id = ?`, values);
  },

  // Guarda todos los cambios de la ventana de edición en una sola transacción.
  // Orden: campos, carpeta, links, archivos y etiquetas (agregar etiquetas va al final
  // porque es lo único que el servidor podría rechazar, y así no arrastra al resto).
  async applyEdits(id: string, edits: TaskEdits): Promise<void> {
    const ownerId = requireUserId();
    const now = nowIso();
    const { sets, values } = patchToSql(edits.patch ?? {});
    const linksToAdd = (edits.links?.add ?? []).map(validLink);
    const linksToUpdate = (edits.links?.update ?? []).map((link) => ({
      id: link.id,
      ...validLink(link),
    }));
    const tagsToAdd = await withTaskTagIds(id, edits.tags?.add ?? []);
    const filesToAdd = await stageFiles(ownerId, id, edits.files?.add ?? []);
    // Links y archivos que se quitan: borrado lógico.
    const attachmentsToRemove = [...(edits.links?.remove ?? []), ...(edits.files?.remove ?? [])];

    try {
      await getDb().writeTransaction(async (tx) => {
        if (sets.length > 0) {
          await tx.execute(
            `UPDATE tasks SET ${[...sets, 'updated_at = ?'].join(', ')} WHERE id = ?`,
            [...values, now, id],
          );
        }
        if (edits.folderId) {
          const position = keyBetween(await lastPositionInFolder(tx, edits.folderId), null);
          await tx.execute(
            'UPDATE tasks SET folder_id = ?, position = ?, updated_at = ? WHERE id = ?',
            [edits.folderId, position, now, id],
          );
        }
        for (const attachmentId of attachmentsToRemove) {
          await tx.execute(
            'UPDATE attachments SET deleted_at = ?, updated_at = ? WHERE id = ? AND task_id = ?',
            [now, now, attachmentId, id],
          );
        }
        for (const link of linksToUpdate) {
          await tx.execute(
            'UPDATE attachments SET url = ?, label = ?, updated_at = ? WHERE id = ? AND task_id = ?',
            [link.url, link.label, now, link.id, id],
          );
        }
        await insertLinks(tx, id, ownerId, linksToAdd, now);
        await insertFileRows(tx, id, ownerId, filesToAdd, now);
        for (const tagId of edits.tags?.remove ?? []) {
          await tx.execute('DELETE FROM task_tags WHERE task_id = ? AND tag_id = ?', [id, tagId]);
        }
        await insertTaskTags(tx, id, ownerId, tagsToAdd, now);
      });
    } catch (error) {
      await discardStagedFiles(filesToAdd);
      throw error;
    }
  },

  // Completar desancla la tarea. Desmarcar la devuelve a su posición original (no se tocó).
  async setDone(id: string, done: boolean): Promise<void> {
    const now = nowIso();
    if (done) {
      await getDb().execute(
        'UPDATE tasks SET is_done = 1, done_at = ?, is_pinned = 0, updated_at = ? WHERE id = ?',
        [now, now, id],
      );
    } else {
      await getDb().execute(
        'UPDATE tasks SET is_done = 0, done_at = NULL, updated_at = ? WHERE id = ?',
        [now, id],
      );
    }
  },

  // Mover a otra carpeta: queda al final de la carpeta destino.
  async move(id: string, folderId: string): Promise<void> {
    await getDb().writeTransaction(async (tx) => {
      const position = keyBetween(await lastPositionInFolder(tx, folderId), null);
      await tx.execute(
        'UPDATE tasks SET folder_id = ?, position = ?, updated_at = ? WHERE id = ?',
        [folderId, position, nowIso(), id],
      );
    });
  },

  async setPosition(id: string, position: string): Promise<void> {
    await getDb().execute('UPDATE tasks SET position = ?, updated_at = ? WHERE id = ?', [
      position,
      nowIso(),
      id,
    ]);
  },

  // Borrado lógico: se puede deshacer y se purga a los 30 días.
  async softDelete(id: string): Promise<void> {
    const now = nowIso();
    await getDb().execute('UPDATE tasks SET deleted_at = ?, updated_at = ? WHERE id = ?', [
      now,
      now,
      id,
    ]);
  },

  async restore(id: string): Promise<void> {
    await getDb().execute('UPDATE tasks SET deleted_at = NULL, updated_at = ? WHERE id = ?', [
      nowIso(),
      id,
    ]);
  },

  // Borra definitivamente las completadas que superaron la retención, con sus etiquetas
  // y adjuntos locales (en el servidor se borran en cascada y los archivos quedan en la
  // papelera de Storage para la limpieza diaria). Es idempotente.
  async purgeExpiredCompleted(retentionDays: number, now: Date = new Date()): Promise<number> {
    const db = getDb();
    const done = await db.getAll<{ id: string; done_at: string | null }>(
      'SELECT id, done_at FROM tasks WHERE is_done = 1',
    );
    const expired = done
      .filter((row) => isRetentionExpired(row.done_at, retentionDays, now))
      .map((row) => row.id);
    if (expired.length === 0) return 0;
    const idsJson = JSON.stringify(expired);
    const files = await db.getAll<{ id: string }>(
      "SELECT id FROM attachments WHERE kind = 'file' AND task_id IN (SELECT value FROM json_each(?))",
      [idsJson],
    );
    const fileIds = files.map((file) => file.id);
    await db.writeTransaction(async (tx) => {
      await tx.execute('DELETE FROM task_tags WHERE task_id IN (SELECT value FROM json_each(?))', [
        idsJson,
      ]);
      await tx.execute(
        'DELETE FROM attachment_local_state WHERE id IN (SELECT value FROM json_each(?))',
        [JSON.stringify(fileIds)],
      );
      await tx.execute(
        'DELETE FROM attachments WHERE task_id IN (SELECT value FROM json_each(?))',
        [idsJson],
      );
      await tx.execute('DELETE FROM tasks WHERE id IN (SELECT value FROM json_each(?))', [idsJson]);
    });
    await localFiles.remove(fileIds).catch(() => undefined);
    return expired.length;
  },
};
