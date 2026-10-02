# Fase 1 — Backend, autenticación y spikes

**Estado:** ✅ Código hecho (2026-10-01) · ⏳ Falta aplicarlo en tu proyecto de Supabase · ⏳ Spike B pendiente

## Qué se hizo
- **Migración completa** `supabase/migrations/20261001000000_initial_schema.sql` (copiar y pegar en el SQL Editor):
  - 8 tablas del modelo (incluidas las de etiquetas, adjuntos y recordatorios que se usan en fases posteriores).
  - FKs compuestas con `owner_id` (ninguna fila puede apuntar a datos de otro usuario), `collate "C"` en `position`, CHECK de longitudes y colores, índices para todas las FKs.
  - RLS en todas las tablas, permisos explícitos para `authenticated`, ninguno para `anon`.
  - Triggers: `updated_at`, prevención de ciclos en carpetas, fila de configuración al crear el usuario (+ backfill).
  - Storage: bucket privado `attachments` (10 MB) con políticas por carpeta del usuario.
  - PowerSync: rol `powersync_role` sin contraseña en el archivo y publicación `powersync`.
- **Sync Streams** de PowerSync: `powersync/sync-config.yaml`.
- **Login passwordless** (`src/features/auth/LoginScreen.tsx`): email → código numérico de 8 dígitos (configurable en `OTP_LENGTH`) en el mismo espacio, reenviar con cuenta regresiva de 60 s, cambiar email, errores inline, estados "Enviando…/Verificando…". Sin registro (`shouldCreateUser: false`) y sin revelar qué emails existen.
- **Sesión persistente** sin expiración forzada: `localStorage` en web, `@capacitor/preferences` en Android; renovación del token en primer plano. Abre **sin conexión** aunque el token haya vencido. Nunca cierra sesión por error de red.
- **Cerrar sesión** (solo este dispositivo): confirma, avisa si hay cambios sin sincronizar, borra la base local y la sesión guardada.
- Rutas protegidas (`/login` ↔ resto de la app).
- Captcha (Turnstile/hCaptcha) preparado y apagado.

## Cómo probar
Seguir `docs/SETUP.md` pasos 1 a 7. Luego: login con código; cerrar y volver a abrir la app (y el navegador) sin que pida el código; cerrar sesión y verificar que vuelva al login con la app vacía.

## Pendiente
- Aplicar la migración y la configuración de Auth en tu proyecto (pasos manuales en `docs/SETUP.md`).
- Verificar RLS con un segundo usuario de prueba (opcional: crearlo, comprobar que no ve datos del otro y borrarlo).
- **Spike A (sincronización):** queda cubierto por la Fase 2; falta la prueba real con PowerSync.
- **Spike B (notificación anclada en Android):** necesito modelo y versión de Android del celular. Se hace antes de la Fase 8.
- Rate limits y SMTP propio: configuración del panel de Supabase (ver SETUP).
