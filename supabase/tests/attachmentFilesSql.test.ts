// @vitest-environment node
// Archivos adjuntos (migración 20261003120000): restricciones de las filas y papelera
// de Storage, sobre un Postgres real en WASM (PGlite).

import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildStoragePath, MAX_FILE_BYTES } from '@/lib/files';
import { LIMITS } from '@/lib/validation';
import { createDatabase, migration } from './pglite.ts';

const DAY_MS = 24 * 60 * 60 * 1000;
const ago = (days: number) => new Date(Date.now() - days * DAY_MS).toISOString();

const U1 = '11111111-1111-4111-8111-111111111111';
const U2 = '22222222-2222-4222-8222-222222222222';
const FOLDER = 'f0000000-0000-4000-8000-000000000001';

let db: PGlite;

async function createTask(opts: { owner?: string; doneAt?: string; deletedAt?: string } = {}) {
  const id = crypto.randomUUID();
  await db.query(
    `insert into public.tasks (id, owner_id, folder_id, title, position, is_done, done_at, deleted_at)
     values ($1, $2, $3, 'tarea', 'a0', $4, $5, $6)`,
    [
      id,
      opts.owner ?? U1,
      opts.owner === U2 ? FOLDER.replace(/1$/, '2') : FOLDER,
      opts.doneAt !== undefined,
      opts.doneAt ?? null,
      opts.deletedAt ?? null,
    ],
  );
  return id;
}

interface FileRow {
  id?: string;
  owner?: string;
  taskId: string;
  path?: string;
  fileName?: string | null;
  mimeType?: string | null;
  size?: number | null;
  deletedAt?: string | null;
}

async function insertFile(row: FileRow): Promise<{ id: string; path: string }> {
  const id = row.id ?? crypto.randomUUID();
  const owner = row.owner ?? U1;
  const path = row.path ?? buildStoragePath(owner, row.taskId, id, row.fileName ?? 'foto.jpg');
  await db.query(
    `insert into public.attachments
       (id, owner_id, task_id, kind, storage_path, file_name, mime_type, size_bytes, position, deleted_at)
     values ($1, $2, $3, 'file', $4, $5, $6, $7, 'a0', $8)`,
    [
      id,
      owner,
      row.taskId,
      path,
      row.fileName === undefined ? 'foto.jpg' : row.fileName,
      row.mimeType === undefined ? 'image/jpeg' : row.mimeType,
      row.size === undefined ? 1234 : row.size,
      row.deletedAt ?? null,
    ],
  );
  return { id, path };
}

async function rejects(row: FileRow): Promise<boolean> {
  try {
    await insertFile(row);
    return false;
  } catch (error) {
    if (/check constraint/i.test(String(error))) return true;
    throw error;
  }
}

async function trash(): Promise<string[]> {
  const { rows } = await db.query<{ path: string }>(
    'select path from private.storage_trash order by path',
  );
  return rows.map((row) => row.path);
}

async function storagePaths(): Promise<string[]> {
  const { rows } = await db.query<{ paths: string[] }>(
    'select public.cleanup_storage_paths() as paths',
  );
  return rows[0]?.paths ?? [];
}

// Ejecuta como el usuario autenticado, igual que la API de datos.
async function asUser<T>(userId: string, run: () => Promise<T>): Promise<T> {
  await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [userId]);
  await db.exec('set role authenticated');
  try {
    return await run();
  } finally {
    await db.exec('reset role');
    await db.query(`select set_config('request.jwt.claim.sub', '', false)`);
  }
}

beforeAll(async () => {
  db = await createDatabase([
    '20261001000000_initial_schema.sql',
    '20261002120000_cleanup_functions.sql',
    '20261003120000_attachment_files.sql',
  ]);
  // En Supabase, authenticated ya puede usar el esquema auth (auth.uid() en las políticas).
  await db.exec('grant usage on schema auth to authenticated');
  await db.query('insert into auth.users (id) values ($1), ($2)', [U1, U2]);
  await db.query(
    `insert into public.folders (id, owner_id, name, position) values ($1, $2, 'A', 'a0'), ($3, $4, 'B', 'a0')`,
    [FOLDER, U1, FOLDER.replace(/1$/, '2'), U2],
  );
}, 60_000);

afterAll(async () => {
  await db?.close();
});

beforeEach(async () => {
  await db.exec('delete from public.attachments; delete from private.storage_trash;');
});

describe('restricciones de los archivos adjuntos', () => {
  it('acepta un archivo con la ruta que arma la app', async () => {
    const taskId = await createTask();
    await expect(
      insertFile({ taskId, fileName: 'Presupuesto año 2026.pdf' }),
    ).resolves.toBeTruthy();
  });

  it('el nombre y el tamaño coinciden con los límites de la app', async () => {
    const taskId = await createTask();
    expect(await rejects({ taskId, fileName: 'a'.repeat(LIMITS.fileName) })).toBe(false);
    expect(await rejects({ taskId, fileName: 'a'.repeat(LIMITS.fileName + 1) })).toBe(true);
    expect(await rejects({ taskId, fileName: '' })).toBe(true);
    expect(await rejects({ taskId, mimeType: 'x'.repeat(LIMITS.mimeType + 1) })).toBe(true);
    expect(await rejects({ taskId, size: MAX_FILE_BYTES })).toBe(false);
    expect(await rejects({ taskId, size: MAX_FILE_BYTES + 1 })).toBe(true);
  });

  it('un archivo necesita nombre y tamaño', async () => {
    const taskId = await createTask();
    expect(await rejects({ taskId, fileName: null, path: undefined })).toBe(true);
    expect(await rejects({ taskId, size: null })).toBe(true);
  });

  it('la ruta no puede apuntar a otro usuario, otra tarea u otro adjunto', async () => {
    const taskId = await createTask();
    const otherTask = await createTask();
    const id = crypto.randomUUID();
    const okPath = buildStoragePath(U1, taskId, id, 'foto.jpg');
    expect(await rejects({ id, taskId, path: okPath.replace(U1, U2) })).toBe(true);
    expect(await rejects({ id, taskId, path: okPath.replace(taskId, otherTask) })).toBe(true);
    expect(await rejects({ id, taskId, path: buildStoragePath(U1, taskId, otherTask, 'x') })).toBe(
      true,
    );
    expect(await rejects({ id, taskId, path: `${okPath}/otra` })).toBe(true);
    expect(await rejects({ id, taskId, path: `${U1}/${taskId}/${id}-` })).toBe(true);
    expect(await rejects({ id, taskId, path: `${okPath}${'x'.repeat(1024)}` })).toBe(true);
    expect(await rejects({ id, taskId, path: okPath })).toBe(false);
  });

  it('los links no cambian', async () => {
    const taskId = await createTask();
    await db.query(
      `insert into public.attachments (owner_id, task_id, kind, url, position)
       values ($1, $2, 'link', 'https://example.com', 'a0')`,
      [U1, taskId],
    );
    const { rows } = await db.query<{ total: number }>(
      `select count(*)::int as total from public.attachments where kind = 'link'`,
    );
    expect(rows[0]?.total).toBe(1);
  });
});

describe('papelera de Storage', () => {
  it('nadie la puede leer desde la API', async () => {
    const { rows } = await db.query<Record<string, boolean>>(`
      select
        has_table_privilege('authenticated', 'private.storage_trash', 'select') as auth_select,
        has_table_privilege('anon', 'private.storage_trash', 'select') as anon_select,
        has_function_privilege('authenticated', 'private.queue_storage_delete()', 'execute') as auth_fn
    `);
    expect(rows[0]).toEqual({ auth_select: false, anon_select: false, auth_fn: false });
  });

  it('borrar una tarea desde la app anota sus archivos (cascada)', async () => {
    const taskId = await createTask({ doneAt: ago(8) });
    const file = await insertFile({ taskId });
    await db.query(
      `insert into public.attachments (owner_id, task_id, kind, url, position)
       values ($1, $2, 'link', 'https://example.com', 'a1')`,
      [U1, taskId],
    );
    await asUser(U1, () => db.query('delete from public.tasks where id = $1', [taskId]));
    expect(await trash()).toEqual([file.path]);
  });

  it('borrar un adjunto anota su archivo; el borrado lógico no', async () => {
    const taskId = await createTask();
    const soft = await insertFile({ taskId });
    const hard = await insertFile({ taskId });
    await asUser(U1, async () => {
      await db.query('update public.attachments set deleted_at = now() where id = $1', [soft.id]);
      await db.query('delete from public.attachments where id = $1', [hard.id]);
    });
    expect(await trash()).toEqual([hard.path]);
  });

  it('la limpieza devuelve y vacía las entradas con más de 5 minutos', async () => {
    const taskId = await createTask();
    const old = await insertFile({ taskId });
    const fresh = await insertFile({ taskId });
    await db.query('delete from public.attachments where id in ($1, $2)', [old.id, fresh.id]);
    await db.query(
      `update private.storage_trash set queued_at = now() - interval '10 minutes' where path = $1`,
      [old.path],
    );

    expect(await storagePaths()).toEqual([old.path]);
    await db.query('select public.cleanup_purge()');
    // La reciente queda para la próxima ejecución.
    expect(await trash()).toEqual([fresh.path]);
  });

  it('no borra un archivo que otro adjunto vivo sigue usando', async () => {
    const taskId = await createTask();
    const file = await insertFile({ taskId });
    await db.query(
      `insert into private.storage_trash (path, queued_at) values ($1, now() - interval '1 day')`,
      [file.path],
    );
    expect(await storagePaths()).toEqual([]);
    await db.query('select public.cleanup_purge()');
    expect(await trash()).toEqual([]);
  });

  it('lo que borra la limpieza no vuelve a la papelera', async () => {
    const deletedTask = await createTask({ deletedAt: ago(31) });
    const retained = await createTask({ doneAt: ago(8) });
    const a = await insertFile({ taskId: deletedTask });
    const b = await insertFile({ taskId: retained });
    const c = await insertFile({ taskId: await createTask(), deletedAt: ago(31) });

    expect(await storagePaths()).toEqual([a.path, b.path, c.path].sort());
    const { rows } = await db.query<{ counts: Record<string, number> }>(
      'select public.cleanup_purge() as counts',
    );
    expect(rows[0]?.counts).toMatchObject({ tasks: 2, attachments: 1 });
    expect(await trash()).toEqual([]);
    // La configuración solo vale durante la limpieza: después se vuelve a anotar.
    const d = await insertFile({ taskId: await createTask() });
    await db.query('delete from public.attachments where id = $1', [d.id]);
    expect(await trash()).toEqual([d.path]);
  });
});

describe('orden de las migraciones', () => {
  it('sin las funciones de limpieza avisa qué falta y no aplica nada', async () => {
    const fresh = await createDatabase(['20261001000000_initial_schema.sql']);
    try {
      await expect(fresh.exec(migration('20261003120000_attachment_files.sql'))).rejects.toThrow(
        /20261002120000_cleanup_functions\.sql/,
      );
      await fresh.exec('rollback');
      const { rows } = await fresh.query<{ trash: string | null; checks: number }>(`
        select
          to_regclass('private.storage_trash')::text as trash,
          (select count(*)::int from pg_constraint
            where conname = 'attachments_storage_path_check') as checks
      `);
      expect(rows[0]).toEqual({ trash: null, checks: 0 });
    } finally {
      await fresh.close();
    }
  });
});
