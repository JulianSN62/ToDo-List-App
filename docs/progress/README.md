# Registro de avance

Estado del desarrollo por fase (según la sección 14 de `docs/specs-and-design.md`), con lo hecho, lo pendiente y por dónde seguir. Se actualiza al terminar cada fase o funcionalidad.

**Última actualización:** 2026-10-02 (Bloque 5) · Versión de la app: 0.1.0 · Git: repositorio público en GitHub ([JulianSN62/ToDo-List-App](https://github.com/JulianSN62/ToDo-List-App)) desde el 2026-10-02 (X88). Push solo cuando se pide explícitamente (X89).

**Avance estimado: ~80 % de la v1** (≈ 92 % de la parte web/PWA). Falta:
- La Fase 10 (pulido y entrega): el **Bloque 6**, para web.
- La parte de Android: notificaciones (Fase 8) y cámara (resto de la Fase 9), en unos 2 bloques.

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
| 6 — Configuración, respaldo, limpieza programada | ✅ Hecha (Bloques 3 y 4: alertas de vencimiento también en web) · falta que despliegues la limpieza en Supabase | [phase-06-settings-backup-cleanup.md](./phase-06-settings-backup-cleanup.md) |
| 7 — PWA y desktop | ✅ Hecha en código (Bloque 3) · falta que publiques la web en Netlify | [phase-07-pwa.md](./phase-07-pwa.md) |
| 8 — Android y notificaciones | 🟡 Base Android lista y APK compilado · notificaciones **pospuestas** hasta probar el celular (X84) · cálculo de avisos adelantado (Bloque 4) | [phase-08-android-base.md](./phase-08-android-base.md) |
| 9 — Archivos y fotos | ✅ Hecha en web (Bloque 5) · falta que corras la migración nueva y pruebes con tu cuenta · cámara y Android sin probar (X84) | [phase-09-files.md](./phase-09-files.md) |
| 10 — Pulido y entrega | ⏳ Pendiente | — |
| Tests E2E (spec 15.1) | ✅ En el repo (Bloque 4): `npm run e2e`, 64 tests (10 de adjuntos en el Bloque 5) | [e2e-tests.md](./e2e-tests.md) |

## Plan vigente (2026-10-02, decisiones X84–X87)

Bloques chicos, cada uno cerrado con lint, typecheck, tests y build en verde, documentación al día, **un commit** y tu confirmación.

- **Bloque 3 — ✅ hecho:** resto de las Fases 6 y 7.
- **Bloque 4 — ✅ hecho:** tests E2E en el repo y Ajustes → Alertas de vencimiento en web.
- **Bloque 5 — ✅ hecho:** archivos adjuntos en web (Fase 9). Detalle abajo.
- **Bloque 6 — siguiente sesión: pulido web (Fase 10, web):** carga diferida (bundle de ~1,2 MB), accesibilidad (avisos con una ventana abierta, contraste, foco), errores, estados vacíos, textos finales, `SETUP.md` completo y endurecer `file_paths.xml` de Android (sin probar en el celular).
- **Pospuesto — notificaciones Android (resto de la Fase 8, X84).** Se retoma cuando quieras probar el celular; hace falta el **modelo y la versión de Android** (Spike B). Plan ya armado:
  - **8A Base:** `@capacitor/local-notifications`, canales (`due_alerts`, `reminders`, `pinned`), permisos (notificaciones y alarmas exactas), tabla local `notif_registry`, tocar una notificación abre `/task/:id`, cerrar sesión las cancela.
  - **8B Lógica pura con tests:** ~~cálculo de avisos (6.6)~~ (hecho en el Bloque 4: `dueAlertFireTimes`), conjunto deseado (ventana de 60 días, máx. 200) y diferencias para `reconcile()`.
  - **8C** Avisos de vencimiento programados con la configuración de Ajustes (la pantalla ya está, Bloque 4).
  - **8D Recordatorios personalizados (9.7)**, **8E Tareas ancladas (9.6)** y **8F Diagnóstico (SET-6)** con notificación de prueba.

## Última tanda: Bloque 5 — Archivos adjuntos en web (2026-10-02)

Plan de la sesión en 5 fases (X96): 5A servidor, 5B datos y plataforma, 5C interfaz, 5D pruebas y 5E cierre. Decisiones del usuario en X97 y técnicas en X98–X104. Detalle en [phase-09-files.md](./phase-09-files.md).

- **Adjuntar:** "+ Archivo" en la ventana de la tarea.
  - Varios a la vez, de cualquier tipo. Se adjuntan al guardar, como los links.
  - Las fotos se comprimen (1600 px, calidad 0,8). Se rechaza lo que pase de 10 MB.
- **Lista con estado:** miniatura o ícono, tamaño y "Pendiente de subir" / "Subiendo…" / "No se pudo subir" con **Reintentar** / "En la nube". Se ve en la ventana y en los detalles de la fila.
- **Sin conexión:** el archivo se guarda en el dispositivo y una **cola** lo sube cuando vuelve la red, con reintentos.
- **Abrir:** fotos en un visor, PDF en pestaña nueva, el resto se descarga.
  - Si no está en el dispositivo, se baja con una URL firmada y queda guardado para verlo sin conexión.
  - Las fotos se bajan solas para la miniatura.
- **Ajustes → Datos:** espacio en la nube (de 1 GB) y en el dispositivo, con **Liberar espacio**.
- **Limpieza:**
  - Cerrar sesión borra los archivos del dispositivo.
  - Una **migración nueva** agrega restricciones y una **papelera de Storage**. Corrige que los archivos de tareas borradas desde la app quedaban huérfanos en Storage.

**Verificación:**
- `npm run lint`, `npm run typecheck`, `npm test` (**211 tests**, 31 archivos, incluida la migración nueva sobre PGlite) y `npm run build`: sin errores.
- `npm run e2e`: **64 de 64** en verde (10 nuevos de adjuntos, con Storage ficticio).
- Capturas de la ventana con archivos, los detalles de la fila y Ajustes → Datos, revisadas a 390px y 1280px, en claro y oscuro.
- PDF en pestaña nueva comprobado con Edge real y la CSP de producción.
- `npm run android:build`: el APK de debug sigue compilando (sin probar en el celular, X84).
- **Sin probar todavía (necesita tu cuenta):** la subida real a Storage, ver los archivos desde otro navegador y la limpieza de Storage.

## Tanda anterior: Bloque 4 — Tests E2E y alertas de vencimiento (2026-10-02)

Plan de la sesión en 5 fases (X90): 4A infraestructura E2E, 4B pruebas pasadas al repo + modo sin conexión, 4C lógica pura de las alertas, 4D pantalla de Alertas y 4E cierre.

- **Tests E2E en el repo** (X93–X94). Detalle en [e2e-tests.md](./e2e-tests.md).
  - `npm run e2e` corre 54 pruebas con Playwright y el Edge de la PC, en mobile (390px) y desktop (1280px).
  - Usa un build propio con variables ficticias, así que no lee tu `.env` ni toca tu proyecto.
  - Incluye todo lo que antes se probaba con scripts temporales, el **modo sin conexión** (spec 15.1) y una pasada por las pantallas en tema claro y oscuro.
  - Desde ahora forma parte del cierre de cada bloque.
- **Ajustes → Alertas de vencimiento** (SET-3, X85 y X91–X92), en la subpantalla `/settings/alerts`.
  - Se configuran: activar, el mismo día / 1, 2 o 3 días / 1 semana antes (siempre al menos uno) y la hora.
  - En web aparece la nota de que los avisos llegan en la app de Android.
  - En Ajustes, la fila muestra un resumen.
  - El cálculo de los avisos (spec 6.6) quedó listo en `src/lib/dueAlerts.ts` para cuando se hagan las notificaciones de Android.
  - Detalle en [phase-06-settings-backup-cleanup.md](./phase-06-settings-backup-cleanup.md#alertas-de-vencimiento-set-3-bloque-4-x85-y-x91x92).
- **Corrección encontrada por los E2E** (X95): en mobile los avisos tapaban el botón "+" mientras duraban. Ahora van por encima.

**Verificación:**
- `npm run lint`, `npm run typecheck`, `npm test` (**173 tests**, 28 archivos) y `npm run build`: sin errores.
- `npm run e2e`: 54 de 54 en verde con el código final. Una segunda corrida falló en 4 tests porque la PC se suspendió en el medio (verificado en el registro de Windows: de 19:04 a 19:18). Una tercera se cortó por falta de memoria antes de empezar los tests.
- `npm run android:build`: el APK de debug sigue compilando (no se probó en el celular, X84).
- Capturas de Ajustes y Alertas revisadas a 390px y 1280px, en claro y oscuro.
- **Sin probar todavía (necesita tu cuenta):** cambiar las alertas con datos reales y verlas en otro navegador.

## Tanda anterior: Bloque 3 — Fases 6 y 7 (2026-10-02)

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

1. **Vos — preparar y probar el Bloque 5:**
   1. En el SQL Editor, correr primero `supabase/migrations/20261002120000_cleanup_functions.sql` y después `supabase/migrations/20261003120000_attachment_files.sql` (`docs/SETUP.md`, paso 12.2). La segunda necesita la primera.
   2. Con `npm run dev` y tu cuenta, seguir la lista de [phase-09-files.md](./phase-09-files.md#lo-que-tenés-que-hacer-vos):
      - adjuntar una foto y un PDF y verlos en Storage;
      - abrirlos en otro navegador;
      - adjuntar sin conexión y reconectar.
2. **Vos — pendientes de antes:**
   - Desplegar la limpieza programada en Supabase (`docs/SETUP.md` paso 12).
   - Publicar en Netlify (paso 10).
   - Probar la sincronización real entre dos navegadores.
   - Probar Ajustes → Alertas con datos reales.
3. **Siguiente sesión: Bloque 6** (pulido web, Fase 10).
