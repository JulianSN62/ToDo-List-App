# Fase 7 — PWA y versión desktop

**Estado:** ✅ Hecha en código (2026-10-02). Falta que publiques la web en Netlify (paso tuyo, `docs/SETUP.md` paso 10).

## Primera tanda (2026-10-01)
- **`vite-plugin-pwa`:**
  - Manifest: "ToDo List", standalone, `es-AR`, íconos 192/512/maskable.
  - Service worker con precaché del shell completo, incluidos los workers y el WASM de la base local (~5,3 MB).
  - Aviso "Hay una nueva versión" con botón **Actualizar** y chequeo de actualizaciones cada hora.
- El service worker **no** se registra en Android (Capacitor).
- Probado: la app recarga y funciona **sin conexión** con los datos locales.
- Layout desktop con sidebar colapsable (ver Fase 0). La tercera columna de detalle se quitó el 2026-10-01: el detalle se abre en una ventana modal (X51).
- **Seguridad web:**
  - CSP generada en el build.
  - Cabeceras de seguridad para Netlify: HSTS, X-Frame-Options, nosniff, Referrer-Policy y Permissions-Policy. Desde el 2026-10-02 están en `public/_headers` (ver más abajo, X83).
  - Sin caché para `sw.js` e `index.html`.

## Bloque 3 (2026-10-02) — decisiones X78–X82

### Atajos de teclado (spec 11.7, solo desde 768px)
- **`N`:** hace lo mismo que el botón "+" de la pantalla.
  - En una carpeta, nueva tarea.
  - En Carpetas, nueva carpeta.
  - En Hoy, Buscar y Ajustes no hace nada.
- **`/` o `Ctrl+K`:** abre la búsqueda flotante. En la pantalla Buscar solo enfoca el campo.
- **`Esc` y `Enter`:** cierran ventanas y confirman formularios, como ya hacían.
- Los atajos no actúan mientras escribís (salvo `Ctrl+K`) ni con una ventana, menú o globo abierto. `/` funciona con teclado español.
- La lógica está en `src/lib/shortcuts.ts` (con tests) y el listener global en `src/app/useKeyboardShortcuts.ts`.

### Búsqueda flotante
- Es una ventana centrada de 600px con el mismo contenido que la pantalla Buscar (`SearchPanel` compartido).
- Si abrís una tarea, se abre encima, y al cerrarla volvés a los resultados. "Ir a la carpeta" cierra todo.

### Ayuda de atajos
- Ícono **"?"** en el encabezado de Carpetas y Hoy. Abre un globo con la tabla de atajos (`src/app/ShortcutsHelp.tsx`).
- Componentes nuevos: `src/ui/popover.tsx` y `src/ui/kbd.tsx`.

### Clic derecho
- Sobre una tarea o carpeta abre su menú "⋯".
- No reemplaza el menú del navegador sobre links externos, campos de texto ni texto seleccionado.

### Correcciones
- **"Deshacer" detrás de una ventana:** los avisos se pueden tocar aunque haya una ventana abierta, y tocarlos no la cierra (X81). Hacía falta para eliminar desde la búsqueda flotante.
- **"Esta tarea no existe" fugaz:** al abrir una tarea desde Hoy o Buscar aparecía ese mensaje por un instante. Ya no aparece (`useTask` cuenta la recarga como "cargando").

### Deploy en Netlify (corregido a pedido tuyo, X83)
- **Problema:** las redirecciones de la SPA y las cabeceras de seguridad estaban en `netlify.toml`, en la raíz del proyecto. Al arrastrar solo `dist` ese archivo no viajaba: recargar `/today` daba 404 y faltaban las cabeceras.
- **Corrección:** las reglas pasaron a `public/_redirects` y `public/_headers`, que Vite copia a `dist/`. `netlify.toml` queda solo con el build.
- Ahora sirven las tres formas de publicar: **arrastrar `dist`**, la CLI o un repositorio conectado (`docs/SETUP.md` paso 10, reescrito).
- Verificado: `npm run build` deja `dist/_redirects` y `dist/_headers`; los parsers oficiales de Netlify los leen sin errores y con las mismas reglas que antes; no entran en el precaché del service worker. Test nuevo: `tooling/netlifyConfig.test.ts`.
- `.netlify/` (vínculo de la CLI) se agregó al `.gitignore`.

## Verificación (Bloque 3)
Prueba automatizada en Edge, con el build de producción, sin red y una sesión ficticia: 15 pasos.

**Atajos:**
- `N` en la raíz y dentro de una carpeta.
- Mientras se escribe el título, las letras no disparan atajos.
- La búsqueda flotante abre con `/` y con `Ctrl+K`.
- `Esc` cierra la tarea y vuelve a los resultados; otro `Esc` cierra la búsqueda.
- "Ir a la carpeta" desde el menú cierra la búsqueda.
- "Deshacer" funciona con la búsqueda abierta.
- La ayuda "?" muestra la tabla y, con ella abierta, `N` no actúa.
- En la pantalla Buscar, `/` solo enfoca el campo.

**Clic derecho:** abre el menú de la tarea.

**Mobile 390px:** sin ícono de ayuda; `N` y `/` no hacen nada; Buscar sigue siendo una pantalla.

**Temas:** se revisaron capturas en claro y oscuro. En la consola solo aparecen los errores esperables sin red.

## Cómo probar
1. `npm run build && npm run preview` y abrir http://localhost:4173 en la PC.
2. En Carpetas apretar `N` (nueva carpeta). Dentro de una carpeta, `N` (nueva tarea).
3. `Ctrl+K` o `/`: buscar, abrir una tarea, `Esc` y otra vez `Esc`.
4. Clic derecho sobre una tarea.
5. Ícono "?" junto al indicador de sincronización.

## Pendiente
- **Publicar en Netlify (vos):** `docs/SETUP.md` paso 10 (la forma más simple: `npm run build` y arrastrar `dist`). Después, opcional: el dominio personalizado.
- Dividir el bundle principal (~1,2 MB) con carga diferida → Fase 10.
