# Tareas

Fuente: spec §7.3 (TSK-1–10), §6 (reglas de negocio), §11.3–11.4.

> **Cambio del 2026-10-01 (ver X51–X55 en `docs/DECISIONS.md`):** crear, editar y ver todos los datos de una tarea se hace en una **ventana modal** (bottom sheet alto en mobile, modal centrado de 600px en desktop) con todos los campos del detalle y pie fijo ("Crear y agregar otra" + "Crear", o "Cancelar" + "Guardar"). Ya no existen la creación rápida inline ni el panel de detalle lateral/tercera columna. Cada fila suma una **flecha** (zona táctil 40×48px, entre los indicadores y el menú) que despliega debajo la descripción completa, la fecha larga, prioridad, color y un botón "Editar". Las secciones "Crear tarea rápida" y "Detalle / edición" de abajo quedan como referencia de los campos y medidas.

## Fila de tarea — anatomía y estados

```
 ┃ ☐  Revisar contrato con el cliente   [calendario]Hoy [tag]2 [clip]1   [⋮]
 │  checkbox  título (body, 1 línea truncada con ellipsis)   indicadores   menú
 └ franja de color (4px, solo si la tarea tiene color asignado)
```

**Medidas:** fila 56px (mobile) / 48px (desktop), padding horizontal 16px, checkbox 48×48 tap target (ícono visual 20px dentro), gap de 8px entre indicadores, botón de menú (ícono de más opciones) 48×48 a la derecha. Título en `body` (16px/24px), trunca con `…` si no entra.

**Estados visuales (misma fila, variantes combinables):**

| Estado | Cómo se ve |
|---|---|
| Normal | checkbox vacío, título `text-primary` |
| Prioritaria | ícono estrella ámbar 16px antes de los indicadores; fila sube al tope de su grupo visible (D15); no cambia `position`, solo el orden mostrado |
| Con color | franja izquierda 4px del color token |
| Con fecha | chip `caption`: "Hoy"/"Mañana"/"Ayer"/"Vencida hace N días" — vencida en `overdue` + fondo `overdue-bg` |
| Con tags | chip(s) de color, máx. 2 visibles + "+N" |
| Con adjuntos | ícono clip (paperclip) 16px + contador |
| Con recordatorio [NATIVE] | ícono campana 16px — en desktop se muestra igual pero **solo lectura** (S10) |
| Pinned [NATIVE] | ícono pin (map-pin) 16px, accent — Android únicamente |
| Completada | checkbox lleno (check verde `completed`), título tachado + `text-secondary`, franja de color se atenúa al 50%, fila se mueve a la sección "Completadas" |

Orden mostrado: `is_priority DESC, position ASC` dentro de cada carpeta (regla de negocio §6) — las prioritarias siempre arriba, el resto en su orden manual.

## Gestos (mobile)

```
  [<] deslizar (Eliminar, fondo overdue)      deslizar [>] (Completar, fondo completed)
```
- Swipe completo en una dirección completa la tarea, en la otra la elimina (con Undo).
- La detección de swipe **no arranca en el borde de pantalla** (reserva ~16px) para no chocar con el gesto de "atrás" de Android.
- Reordenar: **drag handle** dedicado (ícono de 6 puntos, 20px, a la izquierda del checkbox, no toda la fila) para no interferir con el scroll vertical — más botones Subir/Bajar disponibles en el menú contextual como alternativa accesible sin gesto.

## Crear tarea rápida (referencia, reemplazado por la ventana modal de X51)

**Mobile — bottom sheet:**
```
┌─────────────────────────────────┐
│  ━━━                             │  handle de arrastre, 32×4px
│  [Nombre de la tarea............] │  input con foco automático, sin label (placeholder)
│  [calendario][★][tag][paleta]     │  chips opcionales (fecha/prioridad/tags/color), tocar expande el control inline
│                                  │
│              [   Listo   ]       │  cierra el panel; Enter = crea y mantiene abierto
└─────────────────────────────────┘
```
Altura dinámica según contenido (`auto`, máx. 50% de la pantalla), sube con el teclado (usa `100dvh` - altura de teclado). Padding interno 16px. Chips: 40px alto, `radius-full`, solo ícono + label corto; al tocar uno se expande un control inline (selector de fecha, prioridad toggle, selector de tags, selector de color) sin cerrar el sheet.

**Desktop — panel inline** (en vez de sheet, aparece como una fila fija arriba de la lista, mismo contenido horizontal): input + chips en una sola fila de 56px, `Enter` crea y mantiene el foco para seguir cargando tareas en cadena (S8 — carga rápida de listas largas).

## Detalle / edición de tarea

**Mobile:** bottom sheet casi full-screen (90% alto). **Desktop:** panel lateral fijo de 400px (ver [`navigation.md`](./navigation.md), layout de 3 columnas) o drawer superpuesto en el breakpoint sidebar.

```
┌─────────────────────────────────┐
│  [x]            Mover · Eliminar │  header: cerrar + acciones secundarias
│                                  │
│  [Revisar contrato............]  │  título, input body, editable inline
│  [Agregar descripción...]        │  textarea auto-height, placeholder sutil si vacío
│                                  │
│  [calendario] Hoy [v]  Hoy·Mañana·Próx.sem·Sin fecha  │  chips de atajo de fecha
│  [★] Prioridad           [toggle]│
│  [paleta] Color  ● ● ● ● ● ● ● ● ● ●│  10 swatches de color
│  [tag] Tags    [+ Agregar tag]   │  tags existentes como chips + crear uno nuevo inline
│  [carpeta] Carpeta  Proyecto [Mover]│
│  [clip] Adjuntos [+ Link] [+ Archivo]│
│  [campana] Recordatorios [NATIVE] │  mobile: editable · desktop: [candado] solo lectura si ya existe
│  [pin] Fijar tarea [NATIVE]       │  mobile: toggle · desktop: [candado] solo indicador
│                                  │
│  [         Eliminar tarea      ] │  texto destructivo, sin confirmación modal (usa Undo)
└─────────────────────────────────┘
```

**Medidas:** padding 16px (mobile) / 24px (desktop), separación entre campos 16px, cada campo opcional vacío se muestra en texto sutil (`text-secondary`, body-sm) tipo "Agregar fecha" / "Agregar descripción" en vez de espacio en blanco (principio "pocos elementos", evita sobrecarga visual). Swatches de color y tags: mismas medidas que en Carpetas (32px, tap 48px).

Atajos de fecha: Hoy / Mañana / Próxima semana / Sin fecha — chips de 40px alto, uno seleccionado en `accent`.

## Adjuntos: archivos (cambio del 2026-10-02, X97–X104)

En "Adjuntos", debajo de los links, va la lista de archivos y la fila de botones **[+ Link] [+ Archivo] [Foto]**. "+ Archivo" permite elegir varios; mientras comprime fotos muestra un spinner y "Preparando…".

- **Foto** (Bloque 8, X127): ícono `Camera`; abre la cámara del teléfono. Aparece en la app de Android y en el navegador con pantalla táctil, no en la PC. La foto se llama `foto-AAAA-MM-DD-HHmmss.jpg`.

```
┌──────────────────────────────────────────────┐
│ [miniatura 40px] frente del DNI.jpg       [x] │  tocar la fila abre el archivo
│                  2 KB · Pendiente de subir     │  caption text-muted
│ [ícono PDF]      contrato.pdf  [Reintentar][x] │  error: estado en text-danger
│                  8 B · No se pudo subir        │
└──────────────────────────────────────────────┘
```

- **Fila:** alto mínimo 56px. Miniatura o ícono de 40×40 (`radius-sm`, borde `line`, fondo `app`): foto recortada (`object-cover`), `FileText` para PDF y `File` para el resto. Nombre en `body-sm` truncado, debajo `caption` con tamaño y estado. La X (40×40) solo aparece en la ventana; en los detalles desplegados de la fila la lista es de solo lectura.
- **Estados:** "Se adjunta al guardar" (todavía no se guardó), "Pendiente de subir" / "Se sube cuando haya conexión", "Subiendo…", "No se pudo subir" (en `danger`, con botón **Reintentar**), "En la nube" (no está en este dispositivo) o nada (listo).
- **Abrir:** foto → visor (ventana con la imagen grande, "Cerrar" y "Descargar"); PDF → pestaña nueva; resto → descarga.
- **Error de tamaño:** debajo de la lista, en `caption` `danger`: "«x» pesa 10,5 MB. El límite es 10 MB por archivo."
- **Ajustes → Datos:** bloque "Archivos adjuntos" (ícono clip) con el espacio en la nube y en el dispositivo, una ayuda y el botón secundario **Liberar espacio** (con confirmación).

## Menú contextual

```
┌──────────────────┐
│ Editar             │
│ [★] Prioridad       │
│ Mover a…            │
│ [↑] Subir [↓] Bajar │
│ [pin] Anclar [NATIVE]│
│ [campana] Recordatorio [NATIVE]│
│ [papelera] Eliminar │
└──────────────────┘
```
Dropdown (desktop, ancla al botón de más opciones) o bottom sheet de opciones (mobile). Cada ítem 48px alto, ícono 20px + label body-sm, "Eliminar" en color `overdue`.

## Sección "Completadas"

Colapsada por defecto, header con contador e ícono de flecha hacia abajo: `[v] Completadas (4)`. Cada fila agrega un `caption` a la derecha: **"Se borra en N días"** (según retención configurada en Ajustes, default 7). Ordenadas por `done_at DESC`. Tocar el checkbox de una completada la "des-completa" y vuelve a su posición original entre las pendientes.
