-- =====================================================================
--  ToDo List - Limpieza programada: funciones SQL (spec 6.4 y 8.4)
--
--  Cómo usarla: Supabase -> SQL Editor -> New query -> pegar TODO este
--  archivo -> Run (después de la migración inicial). Ver docs/SETUP.md,
--  paso "Limpieza programada".
--
--  La Edge Function "cleanup" (supabase/functions/cleanup) las usa una vez
--  por día, en este orden:
--    1. cleanup_storage_paths(): rutas de los archivos adjuntos que se van
--       a purgar, para borrarlos con la API de Storage (no con SQL).
--    2. cleanup_purge(): borra las filas y devuelve cuántas borró.
--  Las dos reciben el mismo instante (p_now) para calcular lo mismo.
--
--  Qué se purga:
--    - Tareas completadas que superaron la retención de su dueño
--      (done_at <= p_now - completed_retention_days), como en la app.
--    - Tareas, adjuntos y etiquetas eliminados lógicamente hace 30 días o más.
--    - Carpetas eliminadas hace 30 días o más, SOLO si en su subárbol no
--      queda ninguna carpeta ni tarea viva (las FK en cascada borrarían todo
--      lo que contiene).
--    - Fechas de recordatorio vencidas hace más de 1 día y recordatorios
--      (de más de 1 día) que se quedaron sin fechas.
--  Al borrar una tarea, la base borra en cascada sus etiquetas asignadas,
--  adjuntos y recordatorios.
--
--  Solo el rol service_role (la secret key de la Edge Function) puede
--  ejecutarlas. Ningún usuario puede llamarlas desde la API.
-- =====================================================================

begin;

-- Esquema interno: no está expuesto en la API de datos.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Plan de limpieza: qué filas se borran directamente en el instante p_now.
-- ---------------------------------------------------------------------
create or replace function private.cleanup_plan(p_now timestamptz)
returns table (kind text, id uuid)
language sql
stable
set search_path = ''
as $$
  with recursive
    folder_candidates as (
      select f.id
      from public.folders f
      where f.deleted_at is not null
        and f.deleted_at <= p_now - interval '30 days'
    ),
    folder_subtree (root_id, folder_id) as (
      select c.id, c.id from folder_candidates c
      union
      select s.root_id, f.id
      from public.folders f
      join folder_subtree s on f.parent_id = s.folder_id
    )
  -- Completadas que superaron la retención (igual que en la app).
  select 'task'::text, t.id
  from public.tasks t
  join public.user_settings s on s.owner_id = t.owner_id
  where t.is_done
    and t.done_at is not null
    and t.done_at <= p_now - make_interval(days => s.completed_retention_days)
  union
  -- Eliminadas lógicamente hace 30 días o más.
  select 'task', t.id
  from public.tasks t
  where t.deleted_at is not null
    and t.deleted_at <= p_now - interval '30 days'
  union all
  select 'attachment', a.id
  from public.attachments a
  where a.deleted_at is not null
    and a.deleted_at <= p_now - interval '30 days'
  union all
  select 'tag', g.id
  from public.tags g
  where g.deleted_at is not null
    and g.deleted_at <= p_now - interval '30 days'
  union all
  -- Carpetas sin nada vivo en su subárbol.
  select 'folder', c.id
  from folder_candidates c
  where not exists (
      select 1
      from folder_subtree s
      join public.folders f on f.id = s.folder_id
      where s.root_id = c.id and f.deleted_at is null
    )
    and not exists (
      select 1
      from folder_subtree s
      join public.tasks t on t.folder_id = s.folder_id
      where s.root_id = c.id and t.deleted_at is null
    )
  union all
  select 'reminder_time', rt.id
  from public.reminder_times rt
  where rt.fire_at < p_now - interval '1 day'
  union all
  select 'reminder', r.id
  from public.reminders r
  where r.created_at < p_now - interval '1 day'
    and not exists (
      select 1
      from public.reminder_times rt
      where rt.reminder_id = r.id
        and rt.fire_at >= p_now - interval '1 day'
    );
$$;

revoke execute on function private.cleanup_plan(timestamptz) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Paso 1: rutas en Storage de los archivos que se van a purgar
-- (directamente o en cascada). Devuelve un único arreglo para no quedar
-- limitado por la cantidad máxima de filas de la API.
-- ---------------------------------------------------------------------
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
    )
  select coalesce(array_agg(distinct a.storage_path order by a.storage_path), '{}'::text[])
  from public.attachments a
  where a.storage_path is not null
    and (
      a.id in (select p.id from plan p where p.kind = 'attachment')
      or a.task_id in (select pt.id from purged_tasks pt)
    );
$$;

-- ---------------------------------------------------------------------
-- Paso 2: borra las filas del plan y devuelve las cantidades.
-- ---------------------------------------------------------------------
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

-- Solo la Edge Function (service_role) puede ejecutarlas.
revoke execute on function public.cleanup_storage_paths(timestamptz) from public, anon, authenticated;
revoke execute on function public.cleanup_purge(timestamptz) from public, anon, authenticated;
grant execute on function public.cleanup_storage_paths(timestamptz) to service_role;
grant execute on function public.cleanup_purge(timestamptz) to service_role;

commit;
