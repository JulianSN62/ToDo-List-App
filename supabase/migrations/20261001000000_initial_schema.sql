-- =====================================================================
--  ToDo List - Migración inicial
--
--  Cómo usarla: Supabase -> SQL Editor -> New query -> pegar TODO este
--  archivo -> Run. Se ejecuta una sola vez y dentro de una transacción:
--  si algo falla, no queda nada a medias.
--
--  Incluye:
--    1. Tablas del modelo de datos (carpetas, tareas, etiquetas, adjuntos,
--       recordatorios y configuración).
--    2. Triggers (updated_at, prevención de ciclos, configuración inicial).
--    3. Seguridad: RLS en todas las tablas + permisos explícitos.
--    4. Storage: bucket privado "attachments" con sus políticas.
--    5. PowerSync: rol de replicación (sin contraseña) y publicación.
--
--  Después de correrla, seguir docs/SETUP.md (paso de la contraseña del
--  rol powersync_role, que NO se guarda en ningún archivo).
-- =====================================================================

begin;

create extension if not exists pgcrypto with schema extensions;

-- =====================================================================
-- 1. TABLAS
-- Reglas comunes:
--   - id uuid generado en el cliente (permite crear datos sin conexión).
--   - owner_id = dueño de la fila; se usa en RLS y en las FKs compuestas.
--   - Las FKs compuestas (columna_id, owner_id) impiden que una fila
--     referencie datos de otro usuario.
--   - position usa collate "C" para ordenar igual que fractional-indexing.
--   - Los colores se guardan como nombre de token, nunca como hex.
-- =====================================================================

-- ---------- Carpetas ----------
create table public.folders (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  parent_id   uuid,                                  -- null = carpeta raíz
  name        text not null,
  color       text,
  position    text collate "C" not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz,
  constraint folders_id_owner_key unique (id, owner_id),
  constraint folders_parent_fkey foreign key (parent_id, owner_id)
    references public.folders (id, owner_id) on delete cascade,
  constraint folders_name_check check (char_length(btrim(name)) between 1 and 100),
  constraint folders_color_check check (
    color is null or color in ('slate','red','orange','amber','green','teal','blue','indigo','purple','pink')
  ),
  constraint folders_position_check check (char_length(position) between 1 and 500)
);
create index folders_owner_parent_idx on public.folders (owner_id, parent_id);

-- ---------- Tareas ----------
create table public.tasks (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  folder_id    uuid not null,
  title        text not null,
  description  text,
  due_date     date,                                 -- fecha límite (día, sin hora)
  is_priority  boolean not null default false,
  color        text,
  position     text collate "C" not null,            -- orden manual (no cambia al marcar prioridad)
  is_done      boolean not null default false,
  done_at      timestamptz,
  is_pinned    boolean not null default false,       -- anclada (solo Android)
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz,
  constraint tasks_id_owner_key unique (id, owner_id),
  constraint tasks_folder_fkey foreign key (folder_id, owner_id)
    references public.folders (id, owner_id) on delete cascade,
  constraint tasks_title_check check (char_length(btrim(title)) between 1 and 200),
  constraint tasks_description_check check (description is null or char_length(description) <= 10000),
  constraint tasks_color_check check (
    color is null or color in ('slate','red','orange','amber','green','teal','blue','indigo','purple','pink')
  ),
  constraint tasks_position_check check (char_length(position) between 1 and 500)
);
create index tasks_owner_folder_idx on public.tasks (owner_id, folder_id);
create index tasks_owner_due_idx on public.tasks (owner_id, due_date) where is_done = false;
create index tasks_owner_done_idx on public.tasks (owner_id, is_done, done_at);
create index tasks_owner_deleted_idx on public.tasks (owner_id, deleted_at) where deleted_at is not null;

-- ---------- Etiquetas ----------
create table public.tags (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null,
  color       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz,
  constraint tags_id_owner_key unique (id, owner_id),
  constraint tags_name_check check (char_length(btrim(name)) between 1 and 50),
  constraint tags_color_check check (
    color is null or color in ('slate','red','orange','amber','green','teal','blue','indigo','purple','pink')
  )
);
create unique index tags_owner_name_uidx on public.tags (owner_id, lower(name)) where deleted_at is null;

create table public.task_tags (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  task_id     uuid not null,
  tag_id      uuid not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint task_tags_task_tag_key unique (task_id, tag_id),
  constraint task_tags_task_fkey foreign key (task_id, owner_id)
    references public.tasks (id, owner_id) on delete cascade,
  constraint task_tags_tag_fkey foreign key (tag_id, owner_id)
    references public.tags (id, owner_id) on delete cascade
);
create index task_tags_owner_task_idx on public.task_tags (owner_id, task_id);
create index task_tags_owner_tag_idx on public.task_tags (owner_id, tag_id);

-- ---------- Adjuntos (links y archivos) ----------
create table public.attachments (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  task_id       uuid not null,
  kind          text not null,
  label         text,                                -- texto a mostrar (opcional)
  url           text,                                -- para kind = 'link'
  storage_path  text,                                -- para kind = 'file' (ruta en Storage)
  file_name     text,
  mime_type     text,
  size_bytes    bigint,
  position      text collate "C" not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz,
  constraint attachments_task_fkey foreign key (task_id, owner_id)
    references public.tasks (id, owner_id) on delete cascade,
  constraint attachments_kind_check check (kind in ('link', 'file')),
  constraint attachments_payload_check check (
    (kind = 'link' and url is not null) or (kind = 'file' and storage_path is not null)
  ),
  constraint attachments_url_check check (url is null or (url ~* '^https?://' and char_length(url) <= 2048)),
  constraint attachments_label_check check (label is null or char_length(label) <= 200),
  constraint attachments_size_check check (size_bytes is null or (size_bytes >= 0 and size_bytes <= 10485760)),
  constraint attachments_position_check check (char_length(position) between 1 and 500)
);
create index attachments_owner_task_idx on public.attachments (owner_id, task_id);

-- ---------- Recordatorios personalizados ----------
create table public.reminders (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  task_id     uuid not null,
  message     text,                                  -- null = usar el título de la tarea
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint reminders_id_owner_key unique (id, owner_id),
  constraint reminders_task_fkey foreign key (task_id, owner_id)
    references public.tasks (id, owner_id) on delete cascade,
  constraint reminders_message_check check (message is null or char_length(message) <= 200)
);
create index reminders_owner_task_idx on public.reminders (owner_id, task_id);

create table public.reminder_times (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  reminder_id  uuid not null,
  task_id      uuid not null,
  fire_at      timestamptz not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint reminder_times_reminder_fkey foreign key (reminder_id, owner_id)
    references public.reminders (id, owner_id) on delete cascade,
  constraint reminder_times_task_fkey foreign key (task_id, owner_id)
    references public.tasks (id, owner_id) on delete cascade
);
create index reminder_times_owner_fire_idx on public.reminder_times (owner_id, fire_at);
create index reminder_times_owner_reminder_idx on public.reminder_times (owner_id, reminder_id);
create index reminder_times_owner_task_idx on public.reminder_times (owner_id, task_id);

-- ---------- Configuración sincronizada (una fila por usuario) ----------
-- El tema NO va acá: es una preferencia local de cada dispositivo.
create table public.user_settings (
  id                        uuid primary key default gen_random_uuid(),
  owner_id                  uuid not null unique default auth.uid() references auth.users (id) on delete cascade,
  completed_retention_days  integer not null default 7,
  due_alerts_enabled        boolean not null default true,
  due_alert_offsets         text not null default '[1,0]',   -- JSON: días antes del vencimiento
  due_alert_time            text not null default '09:00',   -- HH:mm hora local
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  constraint user_settings_retention_check check (completed_retention_days between 1 and 90),
  constraint user_settings_offsets_check check (due_alert_offsets ~ '^\[\s*(\d+\s*(,\s*\d+\s*)*)?\]$'),
  constraint user_settings_time_check check (due_alert_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$')
);

-- =====================================================================
-- 2. FUNCIONES Y TRIGGERS
-- =====================================================================

-- updated_at automático en cada modificación
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Evita ciclos: una carpeta no puede ser hija de sí misma ni de sus descendientes
create or replace function public.folders_prevent_cycle()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.parent_id is null then
    return new;
  end if;
  if new.parent_id = new.id then
    raise exception 'Una carpeta no puede ser su propia carpeta padre'
      using errcode = '23514';
  end if;
  if exists (
    with recursive descendants as (
      select f.id from public.folders f where f.parent_id = new.id
      union
      select f.id from public.folders f join descendants d on f.parent_id = d.id
    )
    select 1 from descendants where id = new.parent_id
  ) then
    raise exception 'No se puede mover una carpeta dentro de sus propias subcarpetas'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger folders_prevent_cycle_trg
  before insert or update of parent_id on public.folders
  for each row execute function public.folders_prevent_cycle();

-- Crea la fila de configuración por defecto cuando se crea un usuario
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.user_settings (owner_id)
  values (new.id)
  on conflict (owner_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Las funciones de trigger no deben poder invocarse por la API
revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.folders_prevent_cycle() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- Configuración para usuarios que ya existían antes de esta migración
insert into public.user_settings (owner_id)
select u.id from auth.users u
on conflict (owner_id) do nothing;

-- =====================================================================
-- 3. SEGURIDAD: RLS, permisos y updated_at en todas las tablas
-- Cada usuario solo puede leer y escribir sus propias filas.
-- El rol anon (sin sesión) no tiene ningún acceso.
-- =====================================================================
do $$
declare
  t text;
begin
  foreach t in array array[
    'folders', 'tasks', 'tags', 'task_tags', 'attachments',
    'reminders', 'reminder_times', 'user_settings'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on table public.%I from anon', t);
    execute format('grant select, insert, update, delete on table public.%I to authenticated', t);
    execute format(
      'create policy %I on public.%I for all to authenticated
         using (owner_id = (select auth.uid()))
         with check (owner_id = (select auth.uid()))',
      t || '_owner_all', t
    );
    execute format(
      'create trigger %I before update on public.%I
         for each row execute function public.set_updated_at()',
      t || '_set_updated_at', t
    );
  end loop;
end;
$$;

-- =====================================================================
-- 4. STORAGE: bucket privado para archivos adjuntos (se usa en la Fase 9)
-- Ruta de cada objeto: {owner_id}/{task_id}/{attachment_id}-{nombre}
-- Límite de 10 MB por archivo, también controlado del lado del servidor.
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit)
values ('attachments', 'attachments', false, 10485760)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit;

create policy "attachments_owner_select" on storage.objects
  for select to authenticated
  using (bucket_id = 'attachments' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "attachments_owner_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'attachments' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "attachments_owner_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'attachments' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'attachments' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "attachments_owner_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'attachments' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- =====================================================================
-- 5. POWERSYNC: rol de replicación y publicación
-- El rol se crea SIN contraseña. La contraseña se asigna aparte en el
-- SQL Editor (ver docs/SETUP.md) y solo se pega en el dashboard de
-- PowerSync. Nunca se guarda en el repositorio.
-- Solo puede leer (SELECT) las tablas de la app, nada más.
-- =====================================================================
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'powersync_role') then
    create role powersync_role with replication bypassrls login;
  end if;
end;
$$;

grant usage on schema public to powersync_role;
grant select on table
  public.folders, public.tasks, public.tags, public.task_tags, public.attachments,
  public.reminders, public.reminder_times, public.user_settings
to powersync_role;

create publication powersync for table
  public.folders, public.tasks, public.tags, public.task_tags, public.attachments,
  public.reminders, public.reminder_times, public.user_settings;

commit;
