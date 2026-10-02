-- =====================================================================
--  ToDo List - Limpieza programada: tarea diaria (spec 8.4)
--
--  Cómo usarla: Supabase -> SQL Editor -> New query -> pegar TODO este
--  archivo -> Run, DESPUÉS de 20261002120000_cleanup_functions.sql.
--  Ver docs/SETUP.md, paso "Limpieza programada".
--
--  Programa una llamada diaria a la Edge Function "cleanup" a las 06:30 UTC
--  (03:30 en Argentina). La URL del proyecto y la secret key NO están en
--  este archivo: la tarea las lee de Supabase Vault en cada ejecución, con
--  los nombres:
--    - project_url         ej.: https://<ref>.supabase.co
--    - cleanup_secret_key  la secret key "cleanup" (sb_secret_...)
--  Hasta que se carguen esos dos secretos, la tarea corre pero no hace nada.
--
--  Historial de ejecuciones: select * from cron.job_run_details
--    order by start_time desc limit 10;
--  Respuestas de la función (se guardan 6 horas): select * from
--    net._http_response order by created desc limit 10;
-- =====================================================================

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

-- Si ya existía una tarea con este nombre, cron.schedule la reemplaza.
select cron.schedule(
  'cleanup-daily',
  '30 6 * * *',
  $job$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
      || '/functions/v1/cleanup',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'cleanup_secret_key')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  )
  where exists (select 1 from vault.decrypted_secrets where name = 'project_url')
    and exists (select 1 from vault.decrypted_secrets where name = 'cleanup_secret_key');
  $job$
);
