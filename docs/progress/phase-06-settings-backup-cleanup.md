# Fase 6 — Configuración, respaldo y limpieza programada

**Estado:** ✅ Hecha (2026-10-02), dentro del **Bloque 3** (X72). Decisiones X73–X77.

- **Ya estaban de antes:** el tema, la cuenta, la sincronización, "Acerca de" y Ajustes → Etiquetas (Fase 5).
- **Quedan para después:** la pantalla de alertas de vencimiento (SET-3) llega en el Bloque 4, configurable también en web (X85, reemplaza a X73). El diagnóstico de notificaciones (SET-6) queda con las notificaciones de Android, pospuestas (X84).
- **Lo que tenés que hacer vos:** la parte del servidor (pasos abajo).

## Qué se hizo

### Ajustes reorganizados
Siguen los grupos de `design/screens/settings.md`:
- **Apariencia:** tema.
- **Tareas:** retención y etiquetas.
- **Datos:** respaldo y sincronización.
- **Cuenta.**
- **Acerca de.**

### Retención de completadas (SET-2, X74)
- En Ajustes → Tareas hay un stepper **− N días +**, de 1 a 90 días.
- Cada toque se ve al instante y se guarda en `user_settings` tras 400 ms sin tocar. Si salís de la pantalla antes, se guarda igual.
- "Se borra en N días" de las completadas se actualiza solo, porque lee la misma configuración.
- **Antes de la primera sincronización** el stepper está deshabilitado, con un aviso. La fila la crea el servidor y sin ella el cambio se perdería (X20).
- En mobile el stepper va debajo del texto; desde 640px, a la derecha.

### Exportar respaldo JSON (SET-5, spec 7.8, X75)
- El botón está en Ajustes → Datos y genera `mis-tareas-respaldo-YYYY-MM-DD.json`.
- **Contenido:**
  - `formatVersion: 1`, `exportedAt` y `folders`, `tasks`, `tags`, `taskTags`, `attachments`, `reminders`, `reminderTimes` y `settings`.
  - Las filas tienen las mismas columnas que la base del servidor, con booleanos `true/false`.
- **Lo que no incluye:**
  - Lo eliminado ni lo que depende de algo eliminado, como las tareas de carpetas eliminadas o los links de tareas eliminadas.
  - Los archivos adjuntos: solo van sus datos y su `storage_path`.
- **Cómo se guarda:**
  - Web: se descarga.
  - Android: se escribe en la caché de la app y se abre el menú de compartir (Drive, Archivos, mail…). Usa los plugins nuevos `@capacitor/filesystem` y `@capacitor/share`.
- Funciona **sin conexión**, porque lee la base local.
- Después de exportar aparece el aviso "Respaldo exportado: …" y la línea "Último respaldo en este dispositivo: hace …". Es una recomendación de la spec 13: exportar seguido, porque el plan gratuito de Supabase puede no tener backups.
- **Código:**
  - `src/lib/backup.ts`: formato y filtros, con tests.
  - `src/data/repositories/backupRepo.ts`: lectura de la base local.
  - `src/platform/{web,capacitor}/files.ts`: `saveAndShare`.
  - `src/features/settings/BackupSetting.tsx`.

### Limpieza programada en el servidor (spec 8.4, X76–X77)
- **Migración `supabase/migrations/20261002120000_cleanup_functions.sql`:**
  - `cleanup_storage_paths(p_now)` devuelve las rutas de los archivos en Storage que se van a purgar, incluidos los que caen en cascada.
  - `cleanup_purge(p_now)` borra y devuelve las cantidades. Purga:
    - Completadas que superaron la retención de cada usuario.
    - Tareas, adjuntos y etiquetas eliminados hace 30 días o más.
    - Carpetas eliminadas hace 30 días o más, **solo si no tienen nada vivo adentro**.
    - Fechas de recordatorio vencidas hace más de 1 día y recordatorios que quedaron sin fechas.
  - Solo las puede ejecutar `service_role`. El plan interno vive en el esquema `private`, que no está expuesto en la API.
- **Migración `supabase/migrations/20261002120100_cleanup_schedule.sql`:**
  - Activa `pg_cron` y `pg_net`.
  - Programa `cleanup-daily` a las 06:30 UTC (03:30 en Argentina).
  - La URL y la clave se leen de **Vault**: no hay secretos en el repositorio.
- **Edge Function `supabase/functions/cleanup/`:**
  - Primero borra los archivos de Storage en tandas de 100 y después las filas.
  - Si Storage falla, no borra nada y se reintenta al día siguiente.
  - Solo acepta la secret key llamada `cleanup` (`withSupabase({ auth: 'secret:cleanup' })` de `@supabase/server`).
  - En los registros solo escribe cantidades.

## Verificación
- **Tests nuevos:** `backup.test.ts` (7), `RetentionSetting.test.tsx` (5), `supabase/tests/cleanupHandler.test.ts` (5) y `supabase/tests/cleanupSql.test.ts` (6).
- **La prueba SQL** corre la migración inicial real y la de limpieza en **PGlite** (Postgres en WASM), con stubs mínimos de Supabase. Comprueba:
  - Los permisos (solo `service_role`).
  - Las rutas de Storage.
  - Las cantidades borradas.
  - Que no se toca nada más: completadas recientes, otro usuario con 30 días de retención, carpetas eliminadas con una tarea o subcarpeta viva adentro y recordatorios con fechas futuras.
  - Que una segunda ejecución no borra nada.
  - Que no acepta instantes en el futuro.
- **La Edge Function** compila con `deno check` (Deno 2.9) sin errores.
- **Prueba en Edge** (build de producción, sin red): Ajustes con la retención deshabilitada antes del primer sync. La exportación descarga un JSON con el nombre correcto, sin la tarea eliminada, con booleanos reales y `settings: null`. Se probó en tema claro y oscuro, a 1280px y a 390px, sin scroll horizontal.
- **Sin probar todavía:**
  - La función desplegada en tu proyecto.
  - Exportar en el celular con el menú de compartir.
  - El stepper con datos reales (sin red no se descarga la configuración). La lógica está cubierta por el test de componente.

## Pasos para vos
1. Supabase: seguir `docs/SETUP.md`, **paso 12** (Limpieza programada):
   1. Crear la secret key `cleanup`.
   2. Correr las 2 migraciones.
   3. `npx supabase login` y `npx supabase functions deploy cleanup --project-ref <ref> --no-verify-jwt --use-api`.
   4. Cargar `project_url` y `cleanup_secret_key` en Vault.
   5. Probarla una vez a mano (paso 12.5).
2. En la app: Ajustes → Retención, cambiarla y ver que "Se borra en N días" de una completada cambia. Exportar un respaldo en la PC y en el celular.

## Pendiente
- Alertas de vencimiento (configuración, también en web) → Bloque 4 (X85). Diagnóstico de notificaciones → con las notificaciones de Android, pospuestas (X84).
- Importar un respaldo: fuera de la v1 (spec 16).
