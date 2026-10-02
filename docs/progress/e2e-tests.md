# Tests E2E (spec 15.1)

**Estado:** ✅ En el repo desde el Bloque 4 (2026-10-02). Decisiones X93–X95. **54 tests:** 25 en mobile y 29 en desktop. Tardan unos 2–3 minutos, contando el build.

## Cómo se corren

```bash
npm run e2e
```

- **Requisito:** Microsoft Edge instalado. Se usa el de la PC y no se descarga ningún navegador.
- **Qué pasa al correrlo:**
  - Se compila un build propio en `dist-e2e/` con `vite build --mode e2e`.
  - Ese build se sirve con `vite preview` en http://localhost:4174, así que no choca con `npm run preview` (puerto 4173).
- **No usa tu `.env`.** En el modo `e2e` Vite no lee ningún `.env`. Las URLs son ficticias (dominios `.invalid`, que nunca resuelven) y están en `playwright.config.ts`. Por eso los tests andan en cualquier clon del repositorio y nunca tocan tu proyecto de Supabase ni de PowerSync.
- **Si algo falla:**
  - `npx playwright show-report` abre el reporte HTML.
  - En `test-results/` quedan la captura y el trace del test que falló. Se abre con `npx playwright show-trace <archivo>.zip`.
- **No dejes que la PC se suspenda mientras corren.** Si se suspende, al volver los tests fallan por tiempo (aparecen con duraciones de varios minutos aunque el límite es de 60 s). No es un error de la app: hay que volver a correrlos. Conviene cerrar otras instancias de `vite` o `preview`, porque cada worker abre un Edge y la batería usa bastante memoria.
- **Capturas para revisar a ojo:** `e2e/screens.spec.ts` deja las pantallas principales en tema claro y oscuro en `test-results/screens-*/`.

## Cómo funcionan

- **Sesión ficticia:** se guarda en `localStorage` antes de abrir la app (`e2e/fixtures.ts`). La app es offline-first: abre con la sesión guardada y trabaja contra la base local del navegador.
- **Sin red externa:**
  - `context.route` corta todo lo que no sea localhost.
  - Además, Edge arranca con `--host-resolver-rules`, porque los workers de la base local no pasan por `route`.
- **Consola vigilada:** un test falla si aparece un error de consola inesperado, incluidas las violaciones de la CSP. Solo se toleran los errores normales sin red: `powersync: Sync error` y `net::ERR_*`.
- **Textos:** los selectores leen `src/i18n/es.ts`, así que cambiar un texto no rompe los tests.
- **Proyectos:**
  - `mobile`: 390×844, táctil.
  - `desktop`: 1280×800.
  - `desktop.spec.ts` corre solo en desktop y `mobile.spec.ts` solo en mobile.

## Qué cubren

| Archivo | Qué prueba |
|---|---|
| `auth.spec.ts` | Sin sesión va al login y valida el email. Con la sesión guardada abre la app. Cerrar sesión borra la sesión y la base local. |
| `folders.spec.ts` | Carpetas y subcarpetas, breadcrumb y botón Volver. Eliminar una carpeta con contenido pide confirmación y "Deshacer" restaura todo. |
| `tasks.spec.ts` | Ventana de nueva tarea con todos los campos, "Crear y agregar otra" y Enter. Título obligatorio. La prioritaria sube y vuelve a su lugar. Completar y desmarcar ("Se borra en 7 días"). Eliminar con "Deshacer". Detalles desplegables. Descartar cambios pide confirmación. Mover de carpeta. |
| `tags-today-search.spec.ts` | Etiquetas y links en la ventana (se antepone `https://`, se rechaza `javascript:`, se abre en una pestaña nueva). Filtros "Solo prioritarias" y por etiqueta. Grupos de Hoy / Próximas e "Ir a la carpeta". Búsqueda sin tildes ni mayúsculas. Ajustes → Etiquetas. |
| `desktop.spec.ts` | Atajos `N`, `/`, `Ctrl+K` y `Esc`. Búsqueda flotante. "Deshacer" con la búsqueda abierta. Ayuda "?". Clic derecho. |
| `mobile.spec.ts` | Sin atajos ni ayuda. Buscar como pantalla. Botón Volver en Ajustes, Hoy y Buscar. |
| `settings.spec.ts` | El tema se aplica y se recuerda. La retención y las alertas quedan deshabilitadas antes del primer sync. Resumen de alertas y nota de Android. Exportar respaldo JSON, con su contenido validado. |
| `offline.spec.ts` | Sin conexión: la app abre desde el service worker. Crear, editar y borrar. El indicador muestra "Sin conexión · N pendientes" y Ajustes, el contador. Todo sigue al recargar y al volver la conexión. |
| `screens.spec.ts` | Pasada por Carpetas, tareas, Hoy, Buscar, Ajustes y Alertas en tema claro y oscuro: el tema del sistema se respeta y no hay scroll horizontal. |

## Límites (lo que no pueden probar)

- **Sincronización real con el servidor:** sin backend, los cambios quedan pendientes. Se comprueba la cola, pero no la subida. Sigue siendo una prueba manual tuya: dos navegadores con tu cuenta.
- **Login con código real:** hace falta tu email. Ya lo probaste en la Fase 1.
- **Pantallas con la configuración del servidor:** sin la fila `user_settings`, la retención y las alertas solo se ven deshabilitadas. Su lógica con datos está cubierta por los tests de componente: `RetentionSetting.test.tsx` y `DueAlertsScreen.test.tsx`.
- **Android:** los E2E son de la web. El celular se prueba a mano cuando se retome la Fase 8 (X84).

## Hallazgo del primer uso

En mobile, los avisos ("Tarea creada", "Deshacer", "La app ya funciona sin conexión") quedaban a la misma altura que el botón "+" y lo tapaban mientras duraban. Ahora van por encima del botón (X95).

## Cómo agregar un test

1. Crear `e2e/<tema>.spec.ts` e importar `test`, `expect`, `es` y los helpers desde `./fixtures`: `openApp`, `createFolder`, `createTask`, `taskRow`, `chooseMenuItem`, `undoButton`, `expectNoHorizontalScroll`…
2. Buscar los elementos por rol y por el texto de `es.ts`.
3. Correr solo ese archivo: `npx playwright test e2e/<tema>.spec.ts`.
