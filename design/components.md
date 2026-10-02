# Componentes transversales

Componentes compartidos por varias pantallas; se documentan una sola vez acá en vez de repetirlos.

## Toast de Undo

```
┌─────────────────────────────────┐
│  Tarea eliminada        Deshacer │
└─────────────────────────────────┘
```
Aparece abajo (sobre el bottom nav en mobile / esquina inferior izquierda en desktop), 48px alto, `radius-sm`, `--shadow-md`, fondo `surface` + borde `border`. Permanece **~6 segundos**, botón "Deshacer" en `accent`. Se usa para borrar tarea (no para borrar carpeta, que tiene confirmación modal — ver [`folders.md`](./screens/folders.md)).

## Chip (tag / color / filtro)

| Variante | Fondo | Texto/ícono |
|---|---|---|
| Tag | color del tag al 12% opacidad | color del tag sólido |
| Filtro inactivo (ej. "Solo [★]") | `surface` + borde `border` | `text-secondary` |
| Filtro activo | `accent` al 12% | `accent` |

Alto 28px, `radius-full`, padding horizontal 12px, `caption`/`body-sm`.

## Swatch de color (10 tokens)

Círculo de 32px (visual) dentro de un tap target de 48×48. Estado seleccionado: anillo de 2px en `accent` alrededor del círculo, con 2px de separación. Mismo componente en: crear/editar carpeta, color de tarea, crear tag.

## Breadcrumb

Segmentos separados por `›`, cada uno tocable salvo el último (carpeta actual, en `text-primary`/semibold). Se abrevia con `…` cuando no entra en una línea en mobile (muestra primer nivel + `…` + últimos 2). En desktop no hace falta abreviar salvo árboles muy profundos (>5 niveles).

## Overlay de atajos de teclado (solo desktop)

Popover anclado a un ícono de ayuda en el header de la columna central:

```
┌─────────────────────────┐
│  Atajos de teclado        │
│  N          Nueva tarea   │
│  / o Ctrl+K  Buscar        │
│  Esc        Cerrar panel  │
│  Enter      Crear/Confirmar│
└─────────────────────────┘
```
Tecla representada como `kbd` (chip `radius-sm`, fondo `background`, borde `border`, `caption` monoespaciado).

## Notificaciones Android (mockup conceptual — no es UI de la app, es SO)

Se ilustran a nivel conceptual para documentar el canal/comportamiento de cada una (spec §9), no como pantallas a construir:

```
┌─────────────────────────────────┐
│ [campana] Vence hoy: Enviar factura│  canal "due_alerts" — importancia alta
├─────────────────────────────────┤
│ [reloj] Recordatorio: Llamar al cliente│  canal "reminders" — importancia alta
├─────────────────────────────────┤
│ [pin] Revisar contrato (fijada)  │  canal "pinned" — baja, silenciosa, persistente
└─────────────────────────────────┘
```
Sin nombre de app en la línea de título de la notificación (el SO ya identifica la app por su ícono instalado). Tocar cualquiera abre el detalle de la tarea vía deep link `/task/:id`. La notificación `pinned` no debe poder deslizarse para cerrar (solo se quita desde la app) — ver riesgo documentado en spec §17 sobre Android 14+.

## Estado vacío (patrón general)

Usado en carpetas vacías, búsqueda sin resultados, panel de detalle sin tarea seleccionada (desktop): ilustración simple centrada + texto `body`/`text-secondary` de una línea con la acción sugerida. Nunca un estado vacío sin texto guía (requisito §11.6).

## Confirmación modal (patrón general)

Reservado solo para acciones destructivas de alto impacto (borrar carpeta). Modal centrado en desktop (420px), sheet en mobile. Título + texto explicativo con el impacto concreto (cantidad de ítems afectados) + botón destructivo en `overdue` + botón cancelar secundario.
