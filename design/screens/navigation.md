# Navegación — mobile, sidebar y 3 columnas

Fuente: spec §11.2, §11.7. Tokens: [`../tokens.css`](../tokens.css).

## Mobile (`< 768px`): bottom nav + FAB

```
┌─────────────────────────────────┐
│ [<]  … › Cliente X › Proyecto [⋮]│  Header 56px: breadcrumb (abreviado) + menú de carpeta
│                          ● sync │  Punto de 6px, color según estado de sync
├─────────────────────────────────┤
│                                  │
│   (contenido: árbol/lista)       │
│                                  │
│                           ╭───╮  │
│                           │ + │  │  FAB 56px, bottom: 16+safe-area, right: 16
│                           ╰───╯  │
├─────────────────────────────────┤
│ [carpeta] [calendario] [buscar] [ajustes] │  Bottom nav 64px alto
│ Carpetas    Hoy        Buscar   Ajustes   │  Ícono 24px (lucide-react) + label 12px (caption)
└─────────────────────────────────┘
```

Íconos, no emojis: todos los glifos de esta sección (flechas, carpeta, calendario, lupa, engranaje, etc.) son íconos `lucide-react` de 20–24px, nunca caracteres emoji — ver [`../style-guide.md`](../style-guide.md#iconografía).

**Medidas:**
- Header: 56px alto, padding horizontal 16px, botón "atrás" 48×48 tap target.
- Bottom nav: 64px alto + `env(safe-area-inset-bottom)`, 4 ítems de igual ancho (`25%` cada uno), estado activo en `--color-accent` (ícono + label), inactivo en `--color-text-secondary`.
- FAB: 56px diámetro, ícono `+` 24px, `--shadow-md`, siempre visible excepto con teclado abierto.
- Breadcrumb abreviado: muestra primer nivel + `…` + últimos 2 niveles si no entra en una línea; cada segmento es tocable (navega directo), el último no.
- Comportamiento del FAB: dentro de una carpeta crea **tarea**; en la raíz crea **carpeta**. Crear subcarpeta se hace con un botón "+ Subcarpeta" en el header de esa sección, no con el FAB.
- Botón atrás de Android: sube un nivel de carpeta → cierra paneles abiertos → en la raíz, minimiza la app (evento `backButton` de `@capacitor/app`).

## Sidebar (`768–1023px`)

```
┌───────────┬──────────────────────────────┐
│           │ [<] … › Cliente X › Proyecto [⋮]│
│ [calendario] Hoy │  ● Sincronizado              │
│ [buscar] Buscar  │──────────────────────────────│
│───────────│                              │
│ ● Universi│   (lista de la carpeta,       │
│   dad   3 │    con panel de detalle       │
│ ● Cliente │    superpuesto si se abre     │
│   X     12│    una tarea)                 │
│   ● Proy..│                              │
│ [ajustes] Ajustes │                              │
└───────────┴──────────────────────────────┘
  280px expandida / 72px colapsada — sin nombre de app ni logo en el sidebar
```

`●` = punto de color de la carpeta (convención folder → color dot, ver [`../style-guide.md`](../style-guide.md#color--convención-de-uso-spec-11-5-literal)), no un ícono de carpeta.

**Medidas:**
- Sidebar: 280px expandida (ícono 20 + label body-sm + contador caption alineado a la derecha), 72px colapsada (solo íconos 24px centrados, tooltip al hover).
- Botón de colapsar/expandir: parte inferior del sidebar, 48×48 tap target.
- Árbol de carpetas: indentación de 16px por nivel, fila de 40px alto (más compacta que en mobile porque el mouse apunta con precisión), contador de pendientes en `caption`/`text-secondary`, indicador de vencidas como punto `--color-overdue` a la izquierda del nombre.
- El panel de detalle de tarea se abre **superpuesto** (no hay tercera columna todavía en este breakpoint) como drawer desde la derecha, 400px, `--shadow-lg`.

## Desktop — 3 columnas (`≥ 1024px`)

> **Cambio del 2026-10-01 (X51 en `docs/DECISIONS.md`):** ya no hay tercera columna ni drawer de detalle; la lista ocupa todo el ancho y el detalle se abre en una ventana modal centrada en cualquier tamaño. Ajustes, Hoy y Buscar tienen botón Volver que lleva a Carpetas (X56).

```
┌───────────┬───────────────────────┬──────────────────┐
│           │ … › Cliente X › Proy. │  Detalle de tarea │
│ [calendario] Hoy │ ● Sincronizado  [buscar] [?]│──────────────────│
│ [buscar] Buscar  │───────────────────────│ Título            │
│───────────│ ● Subproyectos (2)    │ [Descripción]      │
│ ● Universi│ ─────────────────────│ Fecha · Prioridad  │
│   dad   3  │ ☐ Revisar contrato    │ Color · Tags       │
│ ● Cliente │ ☐ [★] Enviar factura  │ Carpeta: Proyecto  │
│   X     12 │ ☑ Subir build  (gris) │ Adjuntos           │
│   ● Proy..│ [v] Completadas (4)   │ Recordatorios [🔒] solo lectura│
│ [ajustes] Ajustes │               │ [Eliminar]         │
└───────────┴───────────────────────┴──────────────────┘
  280px        flexible (min 480px)      400px fijo — sin nombre de app ni logo en el sidebar
```

**Medidas:**
- Columna árbol: 280px (igual que sidebar).
- Columna lista: ancho flexible, mínimo 480px antes de pasar a scroll horizontal (no debería ocurrir en uso normal).
- Columna detalle: 400px fijo, siempre visible cuando hay una tarea seleccionada; si no hay selección, muestra un estado vacío ("Seleccioná una tarea para ver el detalle").
- `[🔒]` = ícono de candado, indicador de solo lectura para Recordatorios/Pin cuando la tarea ya tiene uno creado desde el teléfono (S10) — en desktop no se puede crear/editar, solo se ve.
- Overlay de atajos de teclado: ícono de ayuda (`?` en un círculo) en el header de la columna lista, abre un popover con la tabla `N / Ctrl+K / Esc / Enter`.
- Sin nombre de app ni logo en ningún punto de la navegación (sidebar, header, bottom nav): la identidad visual se apoya solo en la paleta y los íconos.

## Componente: indicador de sync (todas las plataformas)

| Estado | Texto | Color |
|---|---|---|
| Sincronizado | "Sincronizado" | `text-secondary` + check |
| Sincronizando | "Sincronizando…" | `accent` + spinner sutil |
| Sin conexión | "Sin conexión · N pendientes" | `text-secondary` + ícono nube tachada |
| Error | "Error · reintentando" | `overdue` + ícono alerta |

Nunca bloquea la UI; es texto `caption` + ícono 16px, ubicado en el header (mobile/sidebar) o en Ajustes.
