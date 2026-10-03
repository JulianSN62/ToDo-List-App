-- =====================================================================
--  ToDo List - Archivos adjuntos (spec 5.4, 8.4 y 10.2; Fase 9)
--
--  Cómo usarla: Supabase -> SQL Editor -> New query -> pegar TODO este
--  archivo -> Run. REQUIERE haber corrido antes la migración inicial y
--  20261002120000_cleanup_functions.sql (usa su esquema "private" y sus
--  funciones). Ver docs/SETUP.md, paso 12.2.
--
--  Incluye:
--    1. Restricciones para los adjuntos de tipo archivo (nombre, tipo,
--       tamaño y ruta en Storage).
--    2. Papelera de Storage: cuando una fila de adjunto se borra de
--       verdad (desde la app, en cascada al borrar una tarea o carpeta, o
--       al darse de baja la cuenta), su ruta queda anotada para que la
--       limpieza diaria borre el archivo con la API de Storage. Sin esto,
--       el archivo quedaba huérfano: la limpieza ya no encontraba su ruta.
--    3. Nuevas versiones de cleanup_storage_paths() y cleanup_purge() que
--       también vacían la papelera. La Edge Function "cleanup" no cambia.
-- =====================================================================

begin;

-- Sin las funciones de limpieza no se puede seguir: se avisa qué falta correr.
do $$
begin
  if to_regprocedure('private.cleanup_plan(timestamptz)') is null then
    raise exception 'Falta correr antes supabase/migrations/20261002120000_cleanup_functions.sql (docs/SETUP.md, paso 12.2). No se aplicó ningún cambio.';
  end if;
end;
$$;

-- =====================================================================
-- 1. RESTRICCIONES
-- La ruta de cada archivo es {owner_id}/{task_id}/{id}-{nombre}: así una
-- fila no puede apuntar al archivo de otro usuario ni de otro adjunto
-- (la limpieza corre con permisos de servicio y borra lo que figura acá).
-- =====================================================================
alter table public.attachments
  add constraint attachments_file_name_check
    check (file_name is null or char_length(file_name) between 1 and 255),
  add constraint attachments_mime_type_check
    check (mime_type is null or char_length(mime_type) between 1 and 255),
  add constraint attachments_file_fields_check
    check (kind <> 'file' or (file_name is not null and size_bytes is not null)),
  add constraint attachments_storage_path_check
    check (
      storage_path is null or (
        char_length(storage_path) <= 1024
        and storage_path ~ ('^' || owner_id::text || '/' || task_id::text || '/' || id::text || '-[^/]+$')
      )
    );

-- =====================================================================
-- 2. PAPELERA DE STORAGE
-- Solo la usan las funciones de limpieza. Ningún usuario puede leerla.
-- =====================================================================
create table private.storage_trash (
  path       text primary key,
  queued_at  timestamptz not null default now()
);
revoke all on table private.storage_trash from public, anon, authenticated;

create or replace function private.queue_storage_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- La limpieza diaria ya borró estos archivos antes de borrar las filas.
  if coalesce(current_setting('app.cleanup_running', true), '') = 'on' then
    return null;
  end if;
  insert into private.storage_trash (path)
  values (old.storage_path)
  on conflict (path) do nothing;
  return null;
end;
$$;

revoke execute on function private.queue_storage_delete() from public, anon, authenticated;

create trigger attachments_queue_storage_delete
  after delete on public.attachments
  for each row
  when (old.storage_path is not null)
  execute function private.queue_storage_delete();

-- =====================================================================
-- 3. LIMPIEZA: también vacía la papelera
-- Las entradas de la papelera se toman con 5 minutos de margen, para no
-- perder las de un borrado que todavía no terminó de confirmarse mientras
-- corre la limpieza. Las dos funciones usan el mismo corte.
-- =====================================================================
create or replace function public.cleanup_storage_paths(p_now timestamptz default now())
returns text[]
language sql
stable
security definer
set search_path = ''
as $$
  with recursive
    plan as (
      select p.kind, p.id from private.cleanup_plan(least(p_now, now())) p
    ),
    purged_folders (id) as (
      select p.id from plan p where p.kind = 'folder'
      union
      select f.id
      from public.folders f
      join purged_folders pf on f.parent_id = pf.id
    ),
    purged_tasks (id) as (
      select p.id from plan p where p.kind = 'task'
      union
      select t.id
      from public.tasks t
      join purged_folders pf on t.folder_id = pf.id
    ),
    paths (path) as (
      select a.storage_path
      from public.attachments a
      where a.storage_path is not null
        and (
          a.id in (select p.id from plan p where p.kind = 'attachment')
          or a.task_id in (select pt.id from purged_tasks pt)
        )
      union
      -- Archivos de filas ya borradas, salvo que otro adjunto vivo use la misma ruta.
      select st.path
      from private.storage_trash st
      where st.queued_at <= least(p_now, now()) - interval '5 minutes'
        and not exists (
          select 1
          from public.attachments a
          where a.storage_path = st.path and a.deleted_at is null
        )
    )
  select coalesce(array_agg(distinct p.path order by p.path), '{}'::text[])
  from paths p;
$$;

create or replace function public.cleanup_purge(p_now timestamptz default now())
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := least(p_now, now());
  v_task_ids uuid[];
  v_folder_ids uuid[];
  v_tag_ids uuid[];
  v_attachment_ids uuid[];
  v_reminder_ids uuid[];
  v_reminder_time_ids uuid[];
  v_tasks integer;
  v_folders integer;
  v_tags integer;
  v_attachments integer;
  v_reminders integer;
  v_reminder_times integer;
begin
  -- Los archivos de lo que se borra acá ya se borraron de Storage en el paso 1:
  -- no hace falta anotarlos en la papelera (vale solo para esta transacción).
  perform set_config('app.cleanup_running', 'on', true);

  select
    array_agg(p.id) filter (where p.kind = 'task'),
    array_agg(p.id) filter (where p.kind = 'folder'),
    array_agg(p.id) filter (where p.kind = 'tag'),
    array_agg(p.id) filter (where p.kind = 'attachment'),
    array_agg(p.id) filter (where p.kind = 'reminder'),
    array_agg(p.id) filter (where p.kind = 'reminder_time')
  into v_task_ids, v_folder_ids, v_tag_ids, v_attachment_ids, v_reminder_ids, v_reminder_time_ids
  from private.cleanup_plan(v_now) p;

  delete from public.reminder_times where id = any (v_reminder_time_ids);
  get diagnostics v_reminder_times = row_count;

  delete from public.reminders where id = any (v_reminder_ids);
  get diagnostics v_reminders = row_count;

  delete from public.attachments where id = any (v_attachment_ids);
  get diagnostics v_attachments = row_count;

  delete from public.tasks where id = any (v_task_ids);
  get diagnostics v_tasks = row_count;

  delete from public.tags where id = any (v_tag_ids);
  get diagnostics v_tags = row_count;

  delete from public.folders where id = any (v_folder_ids);
  get diagnostics v_folders = row_count;

  -- Las mismas entradas que devolvió cleanup_storage_paths (mismo corte).
  delete from private.storage_trash where queued_at <= v_now - interval '5 minutes';

  return jsonb_build_object(
    'tasks', v_tasks,
    'folders', v_folders,
    'tags', v_tags,
    'attachments', v_attachments,
    'reminders', v_reminders,
    'reminderTimes', v_reminder_times
  );
end;
$$;

-- create or replace conserva los permisos, pero se repiten por claridad.
revoke execute on function public.cleanup_storage_paths(timestamptz) from public, anon, authenticated;
revoke execute on function public.cleanup_purge(timestamptz) from public, anon, authenticated;
grant execute on function public.cleanup_storage_paths(timestamptz) to service_role;
grant execute on function public.cleanup_purge(timestamptz) to service_role;

commit;
