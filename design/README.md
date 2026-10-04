# Diseño — ToDo List

Diseño completo de la app (basado en `docs/specs-and-design.md`), cubriendo web/desktop y mobile, responsive, con medidas concretas para implementar directamente.

## Cómo está organizado

- **[`tokens.css`](./tokens.css)** / **[`tokens.json`](./tokens.json)** — tokens de diseño (color claro/oscuro, tipografía, spacing, radios, sombras, breakpoints). Fuente de verdad única: todo lo demás referencia estos valores, nunca hex sueltos.
- **[`style-guide.md`](./style-guide.md)** — principios, tipografía (Inter), spacing, tap targets, color, accesibilidad y breakpoints, con el razonamiento detrás de cada decisión.
- **`screens/`** — specs pantalla por pantalla (mobile + desktop), con wireframes en texto y tablas de medidas:
  - [`auth.md`](./screens/auth.md) — Login passwordless: email + código de verificación (mismo espacio cambia de campo)
  - [`navigation.md`](./screens/navigation.md) — bottom nav, sidebar, layout de 3 columnas, FAB, breadcrumb, indicador de sync
  - [`folders.md`](./screens/folders.md) — vista de carpeta, crear/editar, mover, borrar+confirmación, estado vacío
  - [`tasks.md`](./screens/tasks.md) — fila de tarea (todos los estados), crear rápido, detalle/edición, menú contextual, gestos, completadas
  - [`today-search.md`](./screens/today-search.md) — vista Hoy/Upcoming, Buscar
  - [`settings.md`](./screens/settings.md) — Ajustes y sus subpantallas (tema, retención, alertas, tags, export, diagnóstico, cuenta, sync)
- **[`components.md`](./components.md)** — componentes transversales que no pertenecen a una sola pantalla: toast de Undo, chips, swatches de color, breadcrumb, atajos de teclado, mockup de notificaciones Android, estado vacío, confirmación modal.
- **[`canvas/`](./canvas/)** — copia local de los 13 artboards visuales (HTML standalone, sin conexión), con un [`canvas/index.html`](./canvas/index.html) para navegarlos. Es la versión para abrir mientras se desarrolla.

## Versión visual (canvas)

Además de la copia local en [`canvas/`](./canvas/), existe un Artifact de tipo "Design" (canvas de artboards en vivo en claude.ai, editable) con las mismas 13 pantallas.

> Link del Artifact: https://claude.ai/artifact/29wVp6UJMwv2XDcs5JGAwV
>
> Contiene: Tokens y estilo, Auth, Navegación (mobile/desktop), Carpetas (mobile/desktop), Tareas (mobile/desktop), Hoy/Buscar (mobile/desktop), Ajustes (mobile/desktop) y Componentes transversales. Es privado: compartilo desde el menú Share de la página si alguien más necesita abrirlo. La copia en `canvas/` es una foto fija — si se sigue iterando ahí, hay que volver a exportarla.

## Principios clave (resumen — detalle en style-guide.md)

1. Mobile-first y a una mano.
2. Pocos elementos en pantalla; lo opcional aparece solo cuando se pide.
3. El color informa, no decora (paleta neutra + 1 acento + 10 colores de usuario).
4. Rápido: crear tarea en segundos, navegar en un toque, sin spinners para datos locales.
5. Mobile y desktop comparten las mismas pantallas e información; difieren en chrome de navegación (bottom nav+FAB vs. sidebar/3-columnas) y en que Recordatorios/Pin son editables solo en Android (en desktop, indicador de solo lectura).
6. Sin nombre de app ni logo en ninguna pantalla; sin emoji en ningún punto de la UI — todo ícono es vectorial (`lucide-react` en código, SVG inline en los mocks). Login sin pestañas de login/registro/reset: un único flujo de email + código de verificación.

## Breakpoints

| Rango | Navegación |
|---|---|
| `< 768px` | Bottom nav + FAB |
| `768–1023px` | Sidebar colapsable |
| `≥ 1024px` | 3 columnas (árbol · lista · detalle) |
