// Edge Function "cleanup": la llama una vez por día la tarea programada con pg_cron
// (migración 20261002120100_cleanup_schedule.sql). Ver docs/SETUP.md.
//
// Solo acepta la secret key llamada "cleanup" en el header apikey (no la de usuarios
// ni la publishable). Se despliega con --no-verify-jwt porque las claves nuevas no
// son JWT; la validación la hace withSupabase.

import { withSupabase } from 'npm:@supabase/server@1';
import { runCleanup } from './cleanup.ts';

const ATTACHMENTS_BUCKET = 'attachments';

export default {
  fetch: withSupabase({ auth: 'secret:cleanup' }, async (_req, ctx) => {
    const admin = ctx.supabaseAdmin;
    try {
      const result = await runCleanup({
        async storagePaths(now) {
          const { data, error } = await admin.rpc('cleanup_storage_paths', { p_now: now });
          if (error) throw new Error(`cleanup_storage_paths falló (${error.code ?? 'sin código'})`);
          return data;
        },
        async removeFiles(paths) {
          const { error } = await admin.storage.from(ATTACHMENTS_BUCKET).remove(paths);
          if (error) throw new Error(`Storage remove falló (${error.name})`);
        },
        async purge(now) {
          const { data, error } = await admin.rpc('cleanup_purge', { p_now: now });
          if (error) throw new Error(`cleanup_purge falló (${error.code ?? 'sin código'})`);
          return data;
        },
      });
      // Solo cantidades, nunca datos de las tareas.
      console.log(JSON.stringify({ event: 'cleanup', ...result }));
      return Response.json({ ok: true, ...result });
    } catch (error) {
      console.error(error instanceof Error ? error.message : 'cleanup falló');
      return Response.json({ ok: false }, { status: 500 });
    }
  }),
};
