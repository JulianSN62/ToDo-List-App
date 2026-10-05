# Fase 2 — Capa de datos local-first y sincronización

**Estado:** ✅ Hecha (2026-10-01). Sincronización real probada en el Bloque 8 entre tu PC y tu celular.

## Bloque 8 (2026-10-05) — sincronización real
- Al iniciar sesión en el celular bajaron las carpetas creadas desde la PC.
- En modo avión se crearon y editaron tareas y se adjuntó una foto: "Sin conexión · 5 pendientes". Al volver la red se subió todo ("Sincronizado", sin pendientes) y la foto quedó en la nube.
- **Corrección (X129):** el APK no tenía el permiso `ACCESS_NETWORK_STATE` y el WebView creía que siempre había red ("Error · reintentando" en vez de "Sin conexión").

## Qué se hizo
- Base local SQLite con PowerSync (`src/data/db.ts`): SQLite nativo en Android, WASM en navegador. Logs del SDK filtrados (sin datos).
- Esquema local equivalente al de Supabase (`src/data/schema.ts`).
- Conector (`src/data/connector.ts`): token de la sesión de Supabase y subida de cambios PUT/PATCH/DELETE con conversión de booleanos; descarta errores permanentes sin bloquear la cola.
- Repositorios (única puerta de escritura): `folderRepo`, `taskRepo`, `settingsRepo` + limpieza al abrir (`maintenance.ts`).
- Hooks reactivos (`src/data/queries/*`): árbol de carpetas, conteos recursivos de pendientes/vencidas, tareas por carpeta, tarea, configuración.
- Estado de sincronización (`useSyncState`): Sincronizado / Sincronizando / Sin conexión · N pendientes / Error · reintentando, con cantidad de cambios pendientes. Botón "Sincronizar ahora" en Ajustes.
- Lógica pura con tests (`src/lib/`): árbol y ciclos, breadcrumb abreviado, claves de orden (incluidas claves repetidas generadas offline), orden de tareas con prioridad, retención, fechas locales e instantes, validaciones, búsqueda sin tildes.

## Cómo probar
- `npm test`.
- Con credenciales reales: dos navegadores con la misma cuenta; crear/editar/borrar en uno y verlo en el otro. Con DevTools en Offline: hacer cambios, ver "Sin conexión · N pendientes", volver a Online y ver que se sincronicen.

## Pendiente / notas
- `AttachmentRepo`, `TagRepo` y `ReminderRepo` se agregan en sus fases (5, 8 y 9).
- Tablas solo locales (`notif_registry`, `attachment_local_state`) → Fases 8 y 9 (ver DECISIONS X21).
- La "pantalla técnica temporal" del spec no hizo falta: las pantallas finales de carpetas y tareas ya permiten probar la sincronización.
