// @vitest-environment node
// Prueba las funciones SQL de la limpieza programada sobre un Postgres real en WASM
// (PGlite): se aplica la migración inicial y la de limpieza, con stubs mínimos de lo
// que Supabase trae de fábrica (auth, storage y roles).

import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDatabase } from './pglite.ts';

const DAY_MS = 24 * 60 * 60 * 1000;
const ago = (days: number) => new Date(Date.now() - days * DAY_MS).toISOString();

let db: PGlite;
const ids = new Map<string, string>();
const id = (name: string) => {
  let value = ids.get(name);
  if (!value) {
    value = crypto.randomUUID();
    ids.set(name, value);
  }
  return value;
};
const nameOf = (value: string) => [...ids].find(([, uuid]) => uuid === value)?.[0] ?? value;

async function names(sql: string): Promise<string[]> {
  const { rows } = await db.query<{ id: string }>(sql);
  return rows.map((row) => nameOf(row.id)).sort();
}

async function folder(
  name: string,
  owner: string,
  parent: string | null,
  deletedAt: string | null,
) {
  await db.query(
    `insert into public.folders (id, owner_id, parent_id, name, position, deleted_at)
     values ($1, $2, $3, $4, 'a0', $5)`,
    [id(name), id(owner), parent ? id(parent) : null, name, deletedAt],
  );
}

async function task(
  name: string,
  owner: string,
  folderName: string,
  opts: { doneAt?: string; deletedAt?: string } = {},
) {
  await db.query(
    `insert into public.tasks (id, owner_id, folder_id, title, position, is_done, done_at, deleted_at)
     values ($1, $2, $3, $4, 'a0', $5, $6, $7)`,
    [
      id(name),
      id(owner),
      id(folderName),
      name,
      opts.doneAt !== undefined,
      opts.doneAt ?? null,
      opts.deletedAt ?? null,
    ],
  );
}

async function fileAttachment(
  name: string,
  taskName: string,
  path: string,
  deletedAt: string | null = null,
) {
  await db.query(
    `insert into public.attachments (id, owner_id, task_id, kind, storage_path, position, deleted_at)
     values ($1, $2, $3, 'file', $4, 'a0', $5)`,
    [id(name), id('u1'), id(taskName), path, deletedAt],
  );
}

async function linkAttachment(name: string, taskName: string, deletedAt: string | null = null) {
  await db.query(
    `insert into public.attachments (id, owner_id, task_id, kind, url, position, deleted_at)
     values ($1, $2, $3, 'link', 'https://example.com', 'a0', $4)`,
    [id(name), id('u1'), id(taskName), deletedAt],
  );
}

async function reminder(
  name: string,
  taskName: string,
  createdAt: string,
  times: Record<string, string>,
) {
  await db.query(
    `insert into public.reminders (id, owner_id, task_id, created_at) values ($1, $2, $3, $4)`,
    [id(name), id('u1'), id(taskName), createdAt],
  );
  for (const [timeName, fireAt] of Object.entries(times)) {
    await db.query(
      `insert into public.reminder_times (id, owner_id, reminder_id, task_id, fire_at)
       values ($1, $2, $3, $4, $5)`,
      [id(timeName), id('u1'), id(name), id(taskName), fireAt],
    );
  }
}

beforeAll(async () => {
  db = await createDatabase([
    '20261001000000_initial_schema.sql',
    '20261002120000_cleanup_functions.sql',
  ]);

  // Dos usuarios: u1 conserva las completadas 7 días y u2, 30 días.
  await db.query('insert into auth.users (id) values ($1), ($2)', [id('u1'), id('u2')]);
  await db.query(
    'update public.user_settings set completed_retention_days = 30 where owner_id = $1',
    [id('u2')],
  );

  // Carpetas de u1.
  await folder('fA', 'u1', null, null);
  await folder('fGone', 'u1', null, ago(40));
  await folder('fGoneChild', 'u1', 'fGone', ago(40));
  await folder('fKeptLiveTask', 'u1', null, ago(40));
  await folder('fKeptLiveChild', 'u1', null, ago(40));
  await folder('fLiveChild', 'u1', 'fKeptLiveChild', null);
  await folder('fRecent', 'u1', null, ago(10));
  await folder('gA', 'u2', null, null);

  // Tareas.
  await task('tDoneOld', 'u1', 'fA', { doneAt: ago(8) });
  await task('tDoneRecent', 'u1', 'fA', { doneAt: ago(6) });
  await task('tDeletedOld', 'u1', 'fA', { deletedAt: ago(31) });
  await task('tDeletedRecent', 'u1', 'fA', { deletedAt: ago(29) });
  await task('tLive', 'u1', 'fA');
  await task('tGone1', 'u1', 'fGone', { deletedAt: ago(40) });
  await task('tGone2', 'u1', 'fGoneChild', { deletedAt: ago(40) });
  await task('tLiveInDeleted', 'u1', 'fKeptLiveTask');
  await task('u2Done8', 'u2', 'gA', { doneAt: ago(8) });

  // Adjuntos.
  await fileAttachment('aDoneOldFile', 'tDoneOld', 'u1/tDoneOld/a1-foto.jpg');
  await linkAttachment('aDoneOldLink', 'tDoneOld');
  await fileAttachment('aGoneFile', 'tGone2', 'u1/tGone2/a-file.pdf');
  await fileAttachment('aLiveKeep', 'tLive', 'u1/tLive/keep.pdf');
  await fileAttachment('aLiveOld', 'tLive', 'u1/tLive/old.pdf', ago(31));
  await linkAttachment('aLiveLinkRecent', 'tLive', ago(29));

  // Etiquetas.
  await db.query(
    `insert into public.tags (id, owner_id, name, deleted_at) values ($1, $3, 'vieja', $4), ($2, $3, 'viva', null)`,
    [id('tagOld'), id('tagLive'), id('u1'), ago(31)],
  );
  await db.query(
    `insert into public.task_tags (id, owner_id, task_id, tag_id) values ($1, $3, $4, $5), ($2, $3, $4, $6)`,
    [id('ttOld'), id('ttLive'), id('u1'), id('tLive'), id('tagOld'), id('tagLive')],
  );

  // Recordatorios.
  await reminder('rPast', 'tLive', ago(3), { rtPast1: ago(2), rtPast2: ago(5) });
  await reminder('rMixed', 'tLive', ago(3), { rtMixedOld: ago(2), rtMixedFuture: ago(-1) });
  await reminder('rNew', 'tLive', ago(0), {});
  await reminder('rRecentTime', 'tLive', ago(3), { rtRecent: ago(0.5) });
}, 60_000);

afterAll(async () => {
  await db?.close();
});

describe('limpieza programada (funciones SQL)', () => {
  it('solo service_role puede ejecutar las funciones', async () => {
    const { rows } = await db.query<Record<string, boolean>>(`
      select
        has_function_privilege('anon', 'public.cleanup_purge(timestamptz)', 'execute') as anon_purge,
        has_function_privilege('authenticated', 'public.cleanup_purge(timestamptz)', 'execute') as auth_purge,
        has_function_privilege('authenticated', 'public.cleanup_storage_paths(timestamptz)', 'execute') as auth_paths,
        has_function_privilege('service_role', 'public.cleanup_purge(timestamptz)', 'execute') as service_purge,
        has_function_privilege('service_role', 'public.cleanup_storage_paths(timestamptz)', 'execute') as service_paths,
        has_schema_privilege('authenticated', 'private', 'usage') as auth_private
    `);
    expect(rows[0]).toEqual({
      anon_purge: false,
      auth_purge: false,
      auth_paths: false,
      service_purge: true,
      service_paths: true,
      auth_private: false,
    });
  });

  it('devuelve las rutas de los archivos que se van a purgar', async () => {
    const { rows } = await db.query<{ paths: string[] }>(
      'select public.cleanup_storage_paths() as paths',
    );
    expect(rows[0]?.paths).toEqual([
      'u1/tDoneOld/a1-foto.jpg',
      'u1/tGone2/a-file.pdf',
      'u1/tLive/old.pdf',
    ]);
  });

  it('borra lo vencido y devuelve las cantidades', async () => {
    const { rows } = await db.query<{ counts: Record<string, number> }>(
      'select public.cleanup_purge() as counts',
    );
    expect(rows[0]?.counts).toEqual({
      tasks: 4,
      folders: 2,
      tags: 1,
      attachments: 1,
      reminders: 1,
      reminderTimes: 3,
    });
  });

  it('no toca lo demás', async () => {
    expect(await names('select id from public.tasks')).toEqual(
      ['tDeletedRecent', 'tDoneRecent', 'tLive', 'tLiveInDeleted', 'u2Done8'].sort(),
    );
    expect(await names('select id from public.folders')).toEqual(
      ['fA', 'fKeptLiveChild', 'fKeptLiveTask', 'fLiveChild', 'fRecent', 'gA'].sort(),
    );
    expect(await names('select id from public.attachments')).toEqual(
      ['aLiveKeep', 'aLiveLinkRecent'].sort(),
    );
    expect(await names('select id from public.tags')).toEqual(['tagLive']);
    expect(await names('select id from public.task_tags')).toEqual(['ttLive']);
    expect(await names('select id from public.reminders')).toEqual(
      ['rMixed', 'rNew', 'rRecentTime'].sort(),
    );
    expect(await names('select id from public.reminder_times')).toEqual(
      ['rtMixedFuture', 'rtRecent'].sort(),
    );
  });

  it('es idempotente: una segunda ejecución no borra nada', async () => {
    const { rows } = await db.query<{ counts: Record<string, number>; paths: string[] }>(
      'select public.cleanup_storage_paths() as paths, public.cleanup_purge() as counts',
    );
    expect(rows[0]?.paths).toEqual([]);
    expect(Object.values(rows[0]?.counts ?? {}).every((count) => count === 0)).toBe(true);
  });

  it('no acepta instantes en el futuro', async () => {
    await task('tDoneSoon', 'u1', 'fA', { doneAt: ago(6) });
    const future = new Date(Date.now() + 5 * DAY_MS).toISOString();
    const { rows } = await db.query<{ counts: Record<string, number> }>(
      'select public.cleanup_purge($1) as counts',
      [future],
    );
    expect(rows[0]?.counts.tasks).toBe(0);
  });
});
