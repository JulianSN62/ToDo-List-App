# Fase 5 — Etiquetas, Hoy/Próximas, búsqueda y links

**Estado:** ✅ Hecha (2026-10-02) · Incluye además la pantalla Ajustes → Etiquetas (SET-4, adelantada de la Fase 6). Decisiones X58–X70.

## Qué se hizo
- **Etiquetas (TAG-1 a TAG-3):**
  - En la ventana de tarea, campo "Etiquetas" con chips. El selector permite buscar, marcar varias y crear nuevas al vuelo (Enter crea; color automático).
  - En la fila: ícono y cantidad en mobile, hasta 2 chips y "+N" en desktop. En los detalles desplegados, todos los chips.
  - Filtro por etiqueta en la vista de carpeta y en la búsqueda.
  - **Ajustes → Etiquetas** (`/settings/tags`): lista con color y cantidad de tareas; crear con "+", renombrar y cambiar color (nombre único sin distinguir mayúsculas), eliminar con confirmación (se quita de todas las tareas).
- **Hoy / Próximas (7.5):**
  - Pendientes con fecha límite de todas las carpetas en grupos Vencidas (en rojo), Hoy, Mañana, Esta semana y Más adelante. Los grupos se pueden plegar y muestran su contador.
  - Debajo del título, la ruta de la carpeta. Chip "Solo prioritarias".
  - Tocar abre la tarea en la ventana, con "Ir a la carpeta".
- **Solo prioritarias** también en la vista de carpeta: abarca la carpeta y sus subcarpetas (en la raíz, todo), junto con el filtro por etiqueta. Muestra una lista plana de pendientes con su ruta.
- **Búsqueda global (SRC-1 a SRC-4):**
  - Busca en título, descripción y etiquetas, sin distinguir mayúsculas ni tildes; todas las palabras tienen que aparecer.
  - Incluye completadas (al final, tachadas).
  - Cada resultado muestra la ruta y las etiquetas que coinciden. Espera corta al escribir.
  - Hay botón para limpiar, filtro por etiqueta y estados vacíos con guía. Funciona sin conexión.
- **Links (10.1):**
  - En la ventana, "Adjuntos" → "+ Link" con dirección y texto opcional, que se pueden editar y quitar. "+ Archivo" sigue bloqueado hasta la Fase 9.
  - Se valida la dirección (solo http/https; sin protocolo se agrega https://).
  - Se abren fuera de la app: pestaña nueva en web, `@capacitor/browser` en Android.
  - Clip con la cantidad en la fila y links clickeables en los detalles.
- **Datos:**
  - `tagRepo` (crear, editar, eliminar, contar) y `taskRepo.create` / `applyEdits` (todo en una transacción).
  - Consultas reactivas `useTags`, `useTaskTagIndex`, `useTaskTagIds`, `useTaskLinks`, `useAttachmentCounts`, `useDueTasks`, `usePendingTasks` y `useAllTasks`.
  - La relación tarea-etiqueta usa un id determinístico (X61).
  - La limpieza por retención borra también las etiquetas y links locales de lo purgado.
  - **Sin migración nueva:** las tablas ya existían.
- **Lógica pura con tests:** `tags.ts`, `links.ts`, `dueGroups.ts`, `search.ts`, `taskFilters.ts`, `ids.ts` (`taskTagId`), y ampliaciones de `taskForm.ts`, `tree.ts`, `taskOrder.ts` y `colors.ts`.

## Verificación
- `npm run lint`, `npm run typecheck`, `npm test` (**120 tests**, 19 archivos) y `npm run build`: sin errores.
- `npm run android:build`: APK de debug compilado con el plugin nuevo (`@capacitor/browser` registrado en Gradle).
- Prueba automatizada en Edge (build de producción, sesión ficticia, **toda la red externa bloqueada**, también por DNS), 18 pasos:
  - Mobile 390px: crear carpetas y tareas con etiqueta nueva y link; "Crear y agregar otra" (conserva etiquetas y vacía links); indicadores y detalles; abrir link en pestaña nueva; link inválido rechazado con confirmación al descartar.
  - Filtros en la raíz (prioritarias y etiqueta, con la ruta de la subcarpeta).
  - Hoy con 4 grupos, filtro y "Ir a la carpeta".
  - Completar una tarea.
  - Búsqueda con tildes y mayúsculas, por descripción y por etiqueta, completadas y sin resultados.
  - Ajustes → Etiquetas: nombre repetido rechazado, renombrar, cambiar color y eliminar.
  - Desktop 1280px en tema oscuro y claro: ventana, Hoy, Buscar, Etiquetas y filtros.
- Errores de consola: solo los esperables sin red (sync de PowerSync y recursos bloqueados). Sin errores de React ni violaciones de la CSP.

## Cómo probar
1. `npm run dev`. Crear una tarea y agregarle etiquetas (escribir un nombre nuevo y Enter) y un link (ej. `ejemplo.com`). Probar "Crear y agregar otra".
2. Desplegar la tarea con la flecha: chips y link (se abre en otra pestaña).
3. En Carpetas, activar "Solo prioritarias" o elegir una etiqueta (en la raíz y dentro de una carpeta con subcarpetas).
4. Hoy: tareas con fechas vencidas, de hoy, de mañana y lejanas. Abrir una y usar "Ir a la carpeta".
5. Buscar: probar sin tildes ni mayúsculas, por una palabra de la descripción y por nombre de etiqueta.
6. Ajustes → Etiquetas: renombrar, cambiar color y eliminar.
7. Repetir algo sin conexión. En el celular (APK), abrir un link: tiene que abrirse en el navegador y volver a la app con "atrás".

## Ajuste del 2026-10-02: fila de tarea en dos líneas en mobile (decisión X71)

**Motivo:** con fecha, etiquetas y adjuntos juntos, el título quedaba muy recortado en mobile (todos los indicadores se amontonaban junto al título en una sola línea de 56px).

**Qué cambió** (`src/features/tasks/TaskRow.tsx`): en mobile (`< 768px`), el título ocupa toda la primera línea y los indicadores (anclada, etiquetas, adjuntos, fecha límite, y la ruta de carpeta en las vistas globales) pasan a una segunda línea debajo, que envuelve si no entran. La fila pasa de altura fija (56px/48px) a altura mínima, para poder crecer cuando hace falta una segunda línea; las tareas sin indicadores se ven exactamente igual que antes. En desktop (`≥ 768px`, hay lugar de sobra) los indicadores siguen a la derecha del título en una sola línea, sin cambios.

**Verificación:** `npm run lint`, `npm run typecheck`, `npm test` (120 tests) y `npm run build` sin errores. Prueba visual en Edge a 390px: título completo con fecha vencida + prioridad + etiqueta en una fila, 3 etiquetas + adjunto + fecha en otra, y el mismo caso en la vista Hoy (con la carpeta debajo del título). Antes el título se veía como "Revisa..."; ahora se lee completo o se recorta solo si el título en sí es muy largo.

## Pendiente / notas
- Atajos de teclado `/` y `Ctrl+K` para buscar (overlay en desktop) y `N` para nueva tarea → Fase 7.
- Archivos y fotos adjuntos → Fase 9.
- Sin probar todavía: sincronización real de etiquetas y links entre dos dispositivos, y abrir links en el celular.
