// Postgres real en WASM (PGlite) para probar las migraciones, con stubs mínimos de lo
// que Supabase trae de fábrica (auth, storage y roles).

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';

export const SUPABASE_STUBS = `
  create schema if not exists extensions;
  create schema if not exists auth;
  create schema if not exists storage;
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  create table auth.users (id uuid primary key);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create table storage.buckets (
    id text primary key, name text not null, public boolean, file_size_limit bigint
  );
  create table storage.objects (
    id uuid primary key default gen_random_uuid(), bucket_id text, name text
  );
  alter table storage.objects enable row level security;
  create function storage.foldername(name text) returns text[] language sql immutable as
    $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
`;

export function migration(name: string): string {
  return readFileSync(fileURLToPath(new URL(`../migrations/${name}`, import.meta.url)), 'utf8');
}

/** Base nueva con los stubs y las migraciones indicadas, en orden. */
export async function createDatabase(migrations: string[]): Promise<PGlite> {
  const db = new PGlite({ extensions: { pgcrypto } });
  await db.exec(SUPABASE_STUBS);
  for (const name of migrations) await db.exec(migration(name));
  return db;
}
