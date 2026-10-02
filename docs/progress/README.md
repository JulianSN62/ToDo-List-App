# Registro de avance

Estado del desarrollo por fase (según la sección 14 de `docs/specs-and-design.md`), con lo hecho, lo pendiente y por dónde seguir. Se actualiza al terminar cada fase o funcionalidad.

**Última actualización:** 2026-10-03 · Versión de la app: 0.1.0 · Git: repositorio público en GitHub ([JulianSN62/ToDo-List-App](https://github.com/JulianSN62/ToDo-List-App)) desde el 2026-10-03 (X88). Push solo cuando se pide explícitamente (X89).

**Prioridad actual (X84):** web y PWA. El proyecto Android se mantiene compilando, pero no se prueba hasta nuevo aviso.

## Estado general

| Fase | Estado | Detalle |
|---|---|---|
| 0 — Fundamentos | ✅ Hecha | [phase-00-foundations.md](./phase-00-foundations.md) |
| 1 — Backend y autenticación | ✅ Hecha · login real probado por vos en el navegador · Spike B pendiente | [phase-01-backend-auth.md](./phase-01-backend-auth.md) |
| 2 — Datos local-first y sync | ✅ Hecha (falta probar sync real entre dispositivos) | [phase-02-data-sync.md](./phase-02-data-sync.md) |
| 3 — Carpetas | ✅ Hecha | [phase-03-folders.md](./phase-03-folders.md) |
| 4 — Tareas (núcleo) | ✅ Hecha · ajustada tras tus pruebas (ventana de tarea, filas expandibles) | [phase-04-tasks.md](./phase-04-tasks.md) |
| 5 — Etiquetas, Hoy, búsqueda, links | ✅ Hecha (+ Ajustes → Etiquetas) · falta probar sync real y links en el celular | [phase-05-tags-today-search.md](./phase-05-tags-today-search.md) |
| 6 — Configuración, respaldo, limpieza programada | ✅ Hecha (Bloque 3) · falta que despliegues la limpieza en Supabase · alertas de vencimiento configurables en web → Bloque 4 (X85) | [phase-06-settings-backup-cleanup.md](./phase-06-settings-backup-cleanup.md) |
| 7 — PWA y desktop | ✅ Hecha en código (Bloque 3) · falta que publiques la web en Netlify | [phase-07-pwa.md](./phase-07-pwa.md) |
| 8 — Android y notificaciones | 🟡 Base Android lista y APK compilado · notificaciones **pospuestas** hasta probar el celular (X84) | [phase-08-android-base.md](./phase-08-android-base.md) |
| 9 — Archivos y fotos | ⏳ Pendiente | — |
| 10 — Pulido y entrega | ⏳ Pendiente | — |

## Plan vigente (2026-10-02, decisiones X84–X87)

Bloques chicos, cada uno cerrado con lint, typecheck, tests y build en verde, documentación al día, **un commit** y tu confirmación.

- **Bloque 3 — ✅ hecho:** resto de las Fases 6 y 7 (detalle abajo).
- **Bloque 4 — siguiente sesión: red de seguridad + alertas en web.**
  - **Tests E2E en el repo** (spec 15.1): `@playwright/test` con el Edge del sistema, `npm run e2e` aparte de `npm test`; build + `vite preview`; sesión ficticia y red bloqueada; pasar las pruebas de la Fase 5 y del Bloque 3 (hoy en una carpeta temporal) y sumar el modo sin conexión.
  - **Ajustes → Alertas de vencimiento** también en web (X85): activar, días 0/1/2/3/7, hora y la nota "Los avisos llegan en la app de Android"; deshabilitado antes de la primera sincronización (como la retención); lógica de validación en `src/lib` con tests, igual a los CHECK de la base.
- **Bloque 5 — archivos adjuntos (Fase 9, web):** elegir archivos desde la PC, límite de 10 MB, compresión de imágenes, cola de subida sin conexión con estado y "Reintentar", URL firmada, caché para ver sin conexión y borrado del archivo al eliminar. La cámara (Android) queda para cuando se pruebe el celular.
- **Bloque 6 — pulido web (Fase 10, web):** carga diferida (bundle de ~1,2 MB), accesibilidad (avisos con una ventana abierta, contraste, foco), errores, estados vacíos, textos finales, `SETUP.md` completo y endurecer `file_paths.xml` de Android (sin probar en el celular).
- **Pospuesto — notificaciones Android (resto de la Fase 8, X84).** Se retoma cuando quieras probar el celular; hace falta el **modelo y la versión de Android** (Spike B). Plan ya armado:
  - **8A Base:** `@capacitor/local-notifications`, canales (`due_alerts`, `reminders`, `pinned`), permisos (notificaciones y alarmas exactas), tabla local `notif_registry`, tocar una notificación abre `/task/:id`, cerrar sesión las cancela.
  - **8B Lógica pura con tests:** cálculo de avisos (6.6), conjunto deseado (ventana de 60 días, máx. 200) y diferencias para `reconcile()`.
  - **8C** Avisos de vencimiento programados con la configuración de Ajustes (la pantalla llega antes, en el Bloque 4).
  - **8D Recordatorios personalizados (9.7)**, **8E Tareas ancladas (9.6)** y **8F Diagnóstico (SET-6)** con notificación de prueba.

## Última tanda: Bloque 3 — Fases 6 y 7 (2026-10-02)

Ajustes reorganizados con **retención** (stepper 1–90), **exportar respaldo JSON** (descarga en web, menú de compartir en Android), **limpieza diaria en el servidor** (funciones SQL + Edge Function + pg_cron, secretos en Vault), **atajos de teclado** (`N`, `/`, `Ctrl+K`), **búsqueda flotante** en desktop, **ayuda de atajos**, **clic derecho** y guía de **deploy en Netlify** (corregido después: ahora también sirve arrastrar `dist`, X83). Además: "Deshacer" se puede tocar con una ventana abierta y se quitó un parpadeo de "Esta tarea no existe" al abrir tareas desde Hoy/Buscar. Detalle en [phase-06-settings-backup-cleanup.md](./phase-06-settings-backup-cleanup.md) y [phase-07-pwa.md](./phase-07-pwa.md); decisiones X72–X82.

**Verificación:**
- `npm run lint`, `npm run typecheck`, `npm test` (**151 tests**, 25 archivos, contando el ajuste de Netlify) y `npm run build`: sin errores.
- Funciones SQL de limpieza probadas sobre Postgres real en WASM (PGlite) con la migración inicial completa; Edge Function verificada con `deno check`.
- `npm run android:build`: APK de debug compilado con los plugins nuevos (`@capacitor/filesystem`, `@capacitor/share`).
- Prueba automatizada en Edge (build de producción, sesión ficticia, red bloqueada) de 15 pasos a 1280px y 390px, tema claro y oscuro: atajos, búsqueda flotante, "Deshacer" con la ventana abierta, ayuda, clic derecho, Ajustes y exportación del JSON (contenido validado). Sin errores de consola salvo los esperables sin red.

## Tanda anterior: Fase 5 completa (2026-10-02)

Etiquetas (con administración en Ajustes), vista Hoy / Próximas, "Solo prioritarias", búsqueda global y links. Detalle en [phase-05-tags-today-search.md](./phase-05-tags-today-search.md); decisiones X58–X70.

**Verificación:** `npm run lint`, `npm run typecheck`, `npm test` (120 tests) y `npm run build` sin errores. APK de debug compilado con el plugin nuevo (`@capacitor/browser`). Prueba automatizada en Edge (build de producción, sesión ficticia, toda la red externa bloqueada) de 18 pasos a 390px y 1280px, tema claro y oscuro: etiquetas, links, filtros, Hoy, búsqueda y Ajustes → Etiquetas. Sin errores de consola salvo los esperables sin red.

## Tanda anterior: ajustes tras las primeras pruebas (2026-10-01)

Pedidos del usuario después de probar el login en el navegador (detalle en [phase-04-tasks.md](./phase-04-tasks.md#ajustes-del-2026-10-01-pedido-del-usuario-decisiones-x51x57) y decisiones X51–X57): ventana modal para crear/editar/ver tareas, flecha para desplegar detalles, mensaje en carpeta sin tareas y botón Volver en Ajustes, Hoy y Buscar. Verificado con lint, typecheck, 67 tests, build y prueba automatizada en Edge.

## Verificación de la primera tanda

- `npm run lint`, `npm run typecheck`, `npm test` (57 tests) y `npm run build`: sin errores.
- APK de debug compilado: `android/app/build/outputs/apk/debug/app-debug.apk`.
- Prueba de humo automatizada en navegador (Edge, build de producción, base local real en WASM) con credenciales ficticias: login redirige, sesión guardada abre la app, crear carpetas y subcarpetas, crear varias tareas seguidas con Enter, prioridad arriba, completar, eliminar con "Deshacer", detalle en bottom sheet / drawer / tercera columna, recarga **sin conexión** desde el service worker, tema oscuro, ajustes, cerrar sesión borra la base local. Sin errores de consola ni violaciones de la CSP.
- **No probado todavía (necesita tus credenciales):** login real con código por email, sincronización con PowerSync entre dos dispositivos y la app instalada en el celular.

## Próximo paso recomendado

1. **Vos — probar el Bloque 3 en la PC** (`npm run dev`): Ajustes → Retención y exportar respaldo; en desktop, atajos `N`, `/`, `Ctrl+K`, el ícono "?" y el clic derecho (pasos en [phase-07-pwa.md](./phase-07-pwa.md#cómo-probar)).
2. **Vos — Supabase (cuando quieras):** desplegar la limpieza programada (`docs/SETUP.md` paso 12: secret key `cleanup`, 2 migraciones, deploy de la función y 2 secretos en Vault) y probarla una vez a mano.
3. **Vos — Netlify (cuando quieras):** `npm run build` y arrastrar la carpeta `dist` (`docs/SETUP.md` paso 10). Después de publicar, recargar `/today` para confirmar que no da 404.
4. **Pendiente de antes (web):** probar la sincronización real entre dos navegadores o perfiles con tu cuenta.
5. **Siguiente sesión: Bloque 4** (tests E2E en el repo + Alertas de vencimiento en web).
