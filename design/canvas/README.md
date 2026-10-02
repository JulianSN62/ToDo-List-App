# Canvas de diseño — copia local

Copia estática de los 13 artboards del Artifact de diseño (link en [`../README.md`](../README.md)), guardada acá para tenerlos disponibles sin conexión mientras se desarrolla, versionados junto con el resto de `design/`.

## Cómo usarlo

Abrí [`index.html`](./index.html) en el navegador (doble clic, o "Abrir con" → tu navegador) — es un índice con un link a cada pantalla, agrupado por módulo. Cada `*.dc.html` es un archivo HTML standalone: se puede abrir directo también.

- Vas a ver un **404 de `support.js`** en la consola del navegador al abrir cada archivo — es esperado y no afecta nada: ese script solo hace falta dentro del editor del Artifact (para el panel de edición en vivo), no para ver el diseño. El contenido visual es HTML/CSS/SVG plano.
- Estos archivos son una **foto fija**: si se sigue iterando el diseño en el Artifact, hay que volver a copiarlos acá (no se sincronizan solos).
- `canvas.json` es el índice original del Artifact (posiciones de cada artboard en el canvas infinito, orden, notas) — útil como referencia de cómo estaban organizados, no hace falta para ver las pantallas individuales.

## Qué es cada archivo

| Archivo | Contenido |
|---|---|
| `Main.dc.html` | Tokens de color/tipografía/spacing/radios/breakpoints (fuente visual, mismo contenido que `../tokens.css`/`../tokens.json`) |
| `Auth.dc.html` | Login passwordless: email + código de verificación |
| `NavigationMobile.dc.html` / `NavigationDesktop.dc.html` | Chrome de navegación: bottom nav+FAB (mobile) vs. sidebar/3 columnas (desktop) |
| `FoldersMobile.dc.html` / `FoldersDesktop.dc.html` | Vista de carpeta, crear/editar, mover, borrar+confirmación, estado vacío |
| `TasksMobile.dc.html` / `TasksDesktop.dc.html` | Fila de tarea (todos los estados), crear rápido, detalle/edición, menú contextual, gestos, completadas |
| `TodaySearchMobile.dc.html` / `TodaySearchDesktop.dc.html` | Vista Hoy/Upcoming y Buscar |
| `SettingsMobile.dc.html` / `SettingsDesktop.dc.html` | Ajustes y subpantallas |
| `Components.dc.html` | Toast, chips, swatches, breadcrumb, atajos de teclado, notificaciones Android, estado vacío, confirmación modal |

Los wireframes con medidas exactas en texto (redlines) siguen en [`../screens/`](../screens/) — este canvas es el complemento visual.
