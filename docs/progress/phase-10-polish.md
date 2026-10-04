# Fase 10 — Pulido, accesibilidad y entrega

**Estado:** ✅ Hecha la parte web (2026-10-03), en el **Bloque 6** (X106). Decisiones X107–X115. Versión de la app: **0.9.0**.

- **Queda para el Bloque 8 (Android):** revisar la UX en el celular (gestos, teclado, áreas seguras), instalar y probar el APK de release firmado, la cámara y pasar a la versión 1.0.0. El APK de release ya se compila y se firma (probado con un keystore descartable), pero no se instaló en el celular (X84).
- **Lo que tenés que hacer vos:** crear tu keystore cuando quieras instalar el APK firmado ([SETUP.md, paso 9](../SETUP.md#apk-firmado-para-instalar-y-actualizar)). El resto de los pendientes con tu cuenta siguen como estaban (ver el [registro](./README.md#próximo-paso-recomendado)).

## Qué se hizo

### 6A — Carga y rendimiento (X107–X109)
- **Carga diferida:** Hoy, Buscar, Ajustes, Alertas, Etiquetas, el login, el formulario de tarea, el de carpeta y la búsqueda flotante se cargan aparte.
  - La barra lateral o inferior se ve siempre; al navegar se ve la pantalla anterior hasta que carga la nueva.
  - Con la sesión abierta, todo eso se carga solo cuando el navegador está libre, así que navegar no espera.
  - Si una pestaña vieja (abierta antes de publicar una versión nueva) pide una parte que ya no existe, la página se recarga una vez.
- **Librerías en archivos aparte** (`vendor-react`, `vendor-data`, `vendor-ui`): una versión nueva que solo cambia la app no obliga a bajar de nuevo unos 900 KB.
- **Precache más liviano:** se dejan afuera las partes de SQLite que la app no usa.

| | Antes | Después |
|---|---|---|
| JavaScript al abrir la app | 1.256 KB (367 KB comprimido), un solo archivo | 1.202 KB (355 KB comprimido): librerías en 3 archivos que quedan en caché + 65 KB de la app |
| Precache del service worker | 5.460 KiB | 4.215 KiB |

- **Listas largas** (1000 tareas en una carpeta, 300 carpetas): sin virtualizar, pero solo se redibuja la fila que cambia.
  - El menú "⋯" se arma al abrirlo.
  - La consulta conserva las tareas que no cambiaron.
  - Se corrigieron dos causas de que se redibujaran todas las filas: las opciones del arrastre y `matchMedia`.
  - Completar una tarea entre 1000: de unos 600 ms a unos 190 ms, medido dentro de la página con el perfilador (desktop, sin limitar la CPU). En un celular será unas 3 o 4 veces más.

### 6B — Errores (X110)
- Un error inesperado muestra "Algo salió mal" con **Recargar**, en vez de una pantalla en blanco.
- Si la base del dispositivo no se puede abrir (ventana privada, almacenamiento bloqueado o lleno), un aviso explica qué pasa. Antes se veía la app vacía y nada se guardaba.
- El error de una pantalla se muestra dentro de la app, con la navegación a mano. Si falta una parte de la app, avisa que hay una versión nueva.
- Cerrar sesión, reintentar una subida, cambios de sesión y guardar ajustes ya no fallan en silencio: avisan y quedan registrados (solo datos técnicos).

### 6C — Accesibilidad (X111, X112, X115)
- **Contraste WCAG AA en los dos temas:**
  - Rojo de vencidas y de peligro, ámbar de prioridad y verde de completadas más oscuros en el tema claro.
  - En oscuro, texto oscuro en los botones llenos (tu elección).
  - Bordes de campos, interruptores y casillas más marcados.
  - Los estados elegidos (filtros, carpeta activa, opciones de los selectores) usan texto principal sobre un fondo índigo suave.
- **Teclado:**
  - Al cerrar una ventana, el foco vuelve al botón que la abrió.
  - **Ctrl+Z** deshace la última eliminación mientras se ve el aviso, también con la búsqueda flotante abierta. Está en la ayuda de atajos.
  - Enlace "Saltar al contenido" (primer Tab).
  - Selector de color con flechas.
  - Foco visible en los menús, los campos y las filas.
- **Lectores de pantalla:**
  - Cada pantalla tiene su título (también en la pestaña: "Hoy · ToDo List").
  - El menú y el asa de cada fila dicen de qué tarea o carpeta son ("Opciones de "Leer apunte"").
  - Al arrastrar se anuncia el nombre y la posición.
  - Avisos en español ("Avisos"), "Anclada" como estado y conteos sin abreviar.
- **Mobile:** tocar un aviso ya no cierra la ventana abierta; los avisos quedan sobre el botón "+" también entre 601 y 767 px de ancho; el "+" y la barra inferior respetan los bordes de pantallas con muesca.
- **Revisión automática con axe** en los tests E2E: pantallas principales en claro y oscuro, mobile y desktop, sin problemas graves ni menores.

### 6D — Estados vacíos, textos y "Mover a…" (X113)
- **"Mover a…" es un árbol plegable:** arranca desplegado hasta la carpeta actual; con la flecha (o las flechas del teclado) se despliegan las demás; al escribir, lista filtrada con la ruta.
- **Estados vacíos nuevos o mejorados:**
  - Carpeta sin nada: "Todavía no hay nada acá." (como el diseño).
  - Carpeta con solo completadas: "No quedan tareas pendientes en esta carpeta."
  - Raíz sin carpetas: guía también en desktop (botón "Nueva carpeta" o tecla N).
  - Búsqueda sin resultados: sugiere otra palabra.
  - Selector de carpetas sin resultados, barra lateral sin carpetas y "Liberar espacio" cuando no hay nada para liberar.
- **Textos:** repaso de `es.ts` (se quitaron 9 sin uso). Nombre definitivo **ToDo List** también en `design/`.
- **Versión 0.9.0** (se ve en Ajustes).

### 6E — Android y documentación (X114)
- **APK de release firmado:** `npm run android:release` con tu keystore (fuera del repositorio). La versión del APK sale de `package.json` (0.9.0 → código 900).
- **Más seguro:** el menú de compartir de Android solo puede acceder a las copias temporales de la app (antes, a todo el almacenamiento). Esas copias se borran al cerrar sesión.
- **`docs/SETUP.md`:** guía del APK firmado, **restaurar desde cero** (las 4 migraciones en orden y todo lo demás) y **publicar una versión nueva**.

## Código

- `src/app/lazyComponent.ts` y `src/app/lazyScreens.ts`: carga diferida, carga anticipada y recarga ante un chunk que falta (`src/lib/chunkReload.ts`, con tests).
- `src/app/ErrorScreens.tsx` (boundary y pantallas de error), `src/data/DataProvider.tsx` (base que no abre).
- `src/ui/sheet.tsx` (foco al abrir y al cerrar, avisos), `src/ui/toast.tsx` (Ctrl+Z), `src/ui/action-menu.tsx` (ítems al abrir, menú no modal), `src/ui/sortable-list.tsx` (anuncios y opciones estables).
- `src/features/tasks/TaskRow.tsx` (memorizada), `TaskList.tsx`, `src/data/queries/tasks.ts` (`rowComparator`), `src/lib/taskOrder.ts` (`stepAvailability`).
- `src/features/folders/FolderPickerSheet.tsx` (árbol) con `visibleTreeItems`, `ancestorIds` y `treeKeyAction` en `src/lib/tree.ts`.
- Tokens: `design/tokens.css` (+ `tokens.json` y la copia en `src/styles/tokens.css`), `design/style-guide.md`.
- Android: `android/app/build.gradle` (firma y versión), `res/xml/file_paths.xml`, `scripts/build-android.mjs --release`.
- Tests nuevos: `e2e/long-lists.spec.ts`, `e2e/a11y.spec.ts`, el árbol en `e2e/folders.spec.ts`, Ctrl+Z en `e2e/desktop.spec.ts`; unitarios del árbol, de Subir/Bajar, de Ctrl+Z, del error boundary, de la base que no abre y de que solo se redibuje la fila que cambió (`TaskList.test.tsx`).

## Verificación

- `npm run lint`, `npm run typecheck`, `npm test` (**231 tests**, 35 archivos) y `npm run build`: sin errores.
- `npm run e2e`: **86 de 86** en verde (41 en mobile y 45 en desktop). Tiempos de listas largas en esa corrida, con 4 navegadores en paralelo: completar una tarea 265 ms (mobile) y 458 ms (desktop), subir una 422 y 275 ms, desplegar detalles 284 y 70 ms.
- `npm run android:build`: el APK de debug compila. `npm run android:release` con un keystore descartable: `apksigner verify` lo da por firmado (esquema v2), con `versionCode 900` y `versionName 0.9.0`. Sin keystore, el script se corta con un aviso. El keystore descartable se borró; nada quedó en el repositorio.
- Perfil de CPU (build sin minificar, en el scratchpad) para encontrar por qué se redibujaban todas las filas.
- **Sin probar todavía:** el APK firmado instalado en el celular, y con tu cuenta, lo de siempre (sync real entre dispositivos y Storage).
