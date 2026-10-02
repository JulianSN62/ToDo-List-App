# Fase 8 — Android (base)

**Estado:** 🟡 Parcial: base lista y APK de debug compilado (2026-10-01). Notificaciones **pospuestas** (2026-10-02, X84): por ahora la prioridad es la web/PWA; el proyecto Android se mantiene compilando pero no se prueba.

## Qué se hizo
- Capacitor 8 configurado (`capacitor.config.ts`): `appId` `com.todolistapp.app`, nombre "ToDo List", esquema `https`, sin contenido mixto.
- Proyecto `android/` generado con los plugins: App, Preferences, Keyboard, SplashScreen, SQLite (Capacitor Community) y PowerSync.
- Pantalla de borde a borde con el plugin **SystemBars** del core (áreas seguras vía CSS) y estilo de barras acorde al tema.
- Botón atrás: cierra paneles → sube de carpeta → vuelve al inicio → minimiza la app.
- Teclado: el WebView se achica para no tapar campos; el botón flotante se oculta con el teclado abierto.
- Seguridad: `allowBackup=false`, reglas de extracción que excluyen todos los datos de copias y transferencias, sin tráfico http.
- Íconos adaptativos y splash generados (`npm run icons`).
- Script `npm run android:build` (busca un JDK 21 y compila). APK verificado: `android/app/build/outputs/apk/debug/app-debug.apk`.

## Cómo probar
`npm run android:build` (con el `.env` completo) → instalar el APK (ver `docs/SETUP.md` paso 9) → login, crear datos, modo avión, volver a conectar.

## Pendiente (resto de la Fase 8, pospuesto hasta probar el celular)
- **Spike B** de la notificación anclada en tu celular (necesito modelo y versión de Android).
- `NotificationService` con `@capacitor/local-notifications`: canales, permisos (notificaciones y alarmas exactas), `reconcile()` con `notif_registry`.
- Avisos de vencimiento configurables, recordatorios con varias fechas, tareas ancladas.
- Diagnóstico de notificaciones en Ajustes y guía de optimización de batería.
- Deep link desde la notificación a `/task/:id` (la ruta ya existe).
- ~~Exportar JSON con compartir nativo~~ → hecho en el Bloque 3 (`@capacitor/filesystem` + `@capacitor/share`, ver [phase-06](./phase-06-settings-backup-cleanup.md)).
- Plan detallado de las notificaciones (8A–8F) en [README.md](./README.md#plan-vigente-2026-10-02-decisiones-x84x87). La pantalla de configuración de las alertas se adelanta al Bloque 4 (X85).
