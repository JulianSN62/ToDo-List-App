# Guía de estilo — Mis Tareas

Fuente: `docs/specs-and-design.md` §11 (UX/UI) + decisiones de tipografía/spacing tomadas acá.
Los valores concretos viven en [`tokens.css`](./tokens.css) / [`tokens.json`](./tokens.json) — este documento explica el *por qué* y cómo se usan.

## Principios (spec §11.1, sin cambios)

1. **Mobile-first y a una mano.** Las acciones primarias caen al alcance del pulgar (FAB abajo a la derecha, bottom sheet en vez de modales centrados).
2. **Pocos elementos en pantalla.** Lo opcional aparece solo cuando se pide (campos de tarea colapsados, menú de más opciones en vez de botones sueltos).
3. **"El color informa, no decora."** La interfaz base es neutra (gris/azulado); el color se reserva para estados (vencida/prioridad/completada) y para lo que el usuario elige (color de carpeta/tarea/tag).
4. **Rápido.** Crear una tarea: pocos segundos. Navegar carpetas: un toque. Sin spinners de carga para datos locales (local-first).
5. **Consistencia y feedback inmediato.**

## Tipografía

**Inter** (Google Fonts), pesos 400/500/600/700. Es la tipografía que faltaba definir en el spec original; se eligió por ser una sans geométrica legible en pantallas chicas, con soporte completo de pesos y muy usada en stacks shadcn/ui + Tailwind (coherente con la stack elegida en §3).

| Rol | Tamaño / interlineado | Peso | Dónde se usa |
|---|---|---|---|
| `caption` | 12 / 16px | 400 | Indicadores de fila (fecha, "Se borra en N días"), metadatos |
| `body-sm` | 14 / 20px | 400 | Chips, texto secundario, filas de Ajustes |
| `body` | 16 / 24px | 400 | Título de tarea, texto principal, inputs |
| `title-sm` | 18 / 24px | 600 | Nombre de carpeta, encabezado de sección ("Completadas") |
| `title-md` | 20 / 28px | 600 | Título de pantalla en mobile (header) |
| `title-lg` | 24 / 32px | 700 | Título de página/panel en desktop |

Reglas: nunca bajar de 14px para texto interactivo (legibilidad + tap target). Los títulos usan `text-primary`; el texto secundario (fechas, contador de carpeta, placeholder de campos vacíos) usa `text-secondary` — **verificado en contraste AA** sobre `background` y `surface` en ambos temas (ver sección Accesibilidad).

## Spacing y grilla

Grilla de **4px**: `4 · 8 · 12 · 16 · 24 · 32 · 48`. Padding estándar de pantalla: 16px en mobile, 24px en desktop. Separación entre filas de lista: 0 (las filas usan el borde inferior `--color-border`, no gap), separación entre secciones: 24px.

## Tamaños de componente y tap targets

- **Tap target mínimo: 48×48px** (checkbox de tarea, botones de ícono, ítems de menú) — requisito explícito del spec (§11.6) por uso a una mano.
- Fila de tarea/carpeta: **56px** de alto (deja 48px de target + padding vertical).
- Bottom nav: **64px** de alto, 4 ítems iguales, ícono 24px + label 12px.
- FAB: **56px** diámetro, posición fija `bottom: 16px + safe-area-inset-bottom`, `right: 16px`.
- Sidebar (≥768px): **280px** de ancho expandido, **72px** colapsado (solo íconos).
- Panel de detalle (≥1024px): **400px** de ancho fijo, scrollable independiente de la lista.

## Radios y elevación

- `radius-sm` (8px): inputs, botones chicos, chips cuadrados.
- `radius-md` (12px): cards, bottom sheet (esquinas superiores), panel de detalle.
- `radius-full`: chips redondeados, avatar, FAB, badges de color.
- **Sombra solo en overlays** (bottom sheet, panel lateral, dropdown, toast, modal de confirmación). Las filas de lista y cards de carpeta/tarea **no llevan sombra** — se separan con `--color-border`, siguiendo "el color informa, no decora": una sombra decorativa en cada fila sería ruido visual.

## Iconografía

`lucide-react`, trazo 2px. **20px** en filas de lista (checkbox, tag, clip de adjunto, campana, pin, estrella de prioridad). **24px** en navegación, botones primarios y FAB. Color: `text-secondary` por defecto; `accent` o el color semántico correspondiente cuando el ícono representa un estado activo (ej. estrella de prioridad en ámbar, pin en accent).

**Nunca emoji.** Ningún glifo emoji (📁, 🔔, ⭐, etc.) en ningún punto de la UI — ni en el código de producción ni en los mocks de este documento/canvas. Todo indicador visual es un ícono vectorial de `lucide-react` (o el SVG equivalente en los mockups de diseño), por consistencia cross-plataforma (un emoji se renderiza distinto en Android/iOS/Windows/fuente del navegador) y por una terminación más prolija y profesional.

## Identidad de marca en la UI

**Sin nombre de app ni logo visibles en ningún punto del producto** — ni en el login, ni en el sidebar/header, ni en el splash. La identidad de la interfaz se apoya solo en la paleta neutra + acento y la tipografía, no en un wordmark o ícono de marca. El nombre "Mis Tareas" (y `com.example.mistareas` como `appId`) es un identificador provisional de proyecto para config/empaquetado (ver spec, intro) — no se renderiza como copy en pantalla.

## Color — convención de uso (spec §11.5, literal)

- **Carpeta** → punto/ícono de color sólido junto al nombre.
- **Tarea** → **franja lateral delgada** (4px) del color, pegada al borde izquierdo de la fila — nunca relleno de fondo completo (eso rompería el contraste del texto y el principio de neutralidad).
- **Tag** → chip con fondo del color al 12% de opacidad + texto/borde del color sólido (asegura contraste AA en ambos temas sin recurrir a texto blanco sobre colores claros como amber).
- **Semántico** (vencida/prioridad/completada) reutiliza los tokens `red`/`amber`/`green` en vez de introducir hex nuevos — mantiene la paleta cerrada a 10 colores + acento.

## Accesibilidad (spec §11.6, checklist de diseño)

- Contraste **WCAG AA** verificado para: `text-primary` y `text-secondary` sobre `background`/`surface` en claro y oscuro; texto de chip sobre su propio fondo tintado al 12%; texto del FAB (`accent-contrast` blanco) sobre `accent`.
- Foco visible (outline de 2px en `accent`) en todo elemento interactivo, navegación completa por teclado en desktop.
- `aria-label` en botones de solo-ícono (FAB, checkbox, menú de más opciones, drag handle).
- Animaciones breves y sobrias (`--duration-fast` 120ms / `--duration-base` 200ms), respetan `prefers-reduced-motion: reduce` (duración → 0).
- Safe areas: todo contenedor de pantalla completa en mobile usa `padding: env(safe-area-inset-top/right/bottom/left)` además del padding de grilla, para notch y gesture bar.
- El teclado en pantalla no debe tapar el campo activo ni los botones del panel de creación (inputs con `scrollIntoView` / sheet con altura dinámica `100dvh`).

## Breakpoints responsive (spec §11.7, exactos)

| Rango | Navegación | Layout |
|---|---|---|
| `< 768px` | Bottom nav (Carpetas/Hoy/Buscar/Ajustes) + FAB | Una columna; detalle de tarea como bottom sheet full-width |
| `768–1023px` | Sidebar colapsable (árbol + accesos) | Dos columnas: sidebar + lista/detalle superpuesto como panel |
| `≥ 1024px` | Sidebar expandida | Tres columnas: árbol · lista · panel de detalle fijo a la derecha |

Atajos de teclado (solo desktop, ≥768px): `N` nueva tarea, `/` o `Ctrl+K` buscar, `Esc` cerrar panel, `Enter` crear/confirmar.
