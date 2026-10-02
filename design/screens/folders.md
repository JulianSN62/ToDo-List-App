# Carpetas

Fuente: spec §7.2 (FOL-1–8), §4 (D4, D7). Ver también [`navigation.md`](./navigation.md) para el chrome de header/sidebar.

## Vista de carpeta (mobile)

```
┌─────────────────────────────────┐
│ [<] … › Cliente X › Proyecto [⋮] │  header 56px, menú [⋮]: Renombrar/Color/Mover/Eliminar
├─────────────────────────────────┤
│ Subcarpetas              + Sub  │  encabezado de sección, botón 40px alto
│ ● Frontend             3 pend.  │  fila 56px: punto de color 12px + nombre + contador
│ ● Backend          1 [!]vencida │  [!] = ícono de alerta, indicador de vencida, color overdue
├─────────────────────────────────┤
│ Tareas                          │
│ ┃☐ Revisar contrato  [fecha]Hoy [tag]2│  ┃ = franja de color 4px si la tarea tiene color
│ ┃☐ [★] Enviar factura [campana][pin]│  [★] prioridad (ámbar) · [campana] recordatorio · [pin] pin (Android) — íconos lucide, no emoji
│  ☑ Subir build a staging        │  completada: texto tachado, checkbox lleno, gris
│ [v] Completadas (4)  borran en 7d│  sección colapsable, caption text-secondary
├─────────────────────────────────┤
│ [carpeta] [calendario] [buscar] [ajustes] │
└─────────────────────────────────┘
                              ╭───╮
                              │ + │  FAB: crea tarea (dentro de carpeta)
                              ╰───╯
```

**Medidas:** fila de carpeta y de tarea: 56px alto, tap target de checkbox 48×48 centrado en la fila. Franja de color: 4px de ancho, pegada al borde izquierdo, alto completo de la fila. Separación entre sección "Subcarpetas" y "Tareas": 24px. "Completadas" colapsada por defecto, con contador entre paréntesis.

## Vista de carpeta (desktop, columna central del layout de 3 columnas)

Mismo contenido que mobile pero sin franja de color en la fila (se reemplaza por una barra lateral de 4px dentro de la fila, igual) y con densidad ligeramente mayor: fila de 48px (vs 56px en mobile) ya que no requiere tap target de dedo pero sí mantiene el mínimo de accesibilidad para click. El botón "+ Subcarpeta" y el ícono de crear tarea aparecen como botones en el header de la columna en vez de FAB flotante.

## Crear / editar carpeta (modal/sheet)

```
┌─────────────────────────────────┐
│  Nueva carpeta            [x]   │
│                                  │
│  Nombre *                       │
│  [______________________]       │  requerido, focus automático
│                                  │
│  Color (opcional)                │
│  ● ● ● ● ● ● ● ● ● ●  (10 tokens)│  swatches 32px, tap target 48px c/u, cada ● en su color token
│                                  │
│  [  Cancelar  ] [   Crear   ]   │
└─────────────────────────────────┘
```

Mobile: bottom sheet (desliza desde abajo, `radius-md` en esquinas superiores, `--shadow-lg`). Desktop: modal centrado 420px de ancho. Swatches de color: círculo de 32px, separación 8px, estado seleccionado con anillo de 2px en `accent`.

## Mover carpeta (selector de árbol con búsqueda)

```
┌─────────────────────────────────┐
│  Mover "Frontend" a…        [x] │
│  [buscar] Buscar carpeta...      │
│                                  │
│  [carpeta] Raíz                 │
│    [carpeta] Universidad         │
│    [carpeta] Cliente X           │
│      [carpeta] Proyecto (actual, gris)│  deshabilitado: no puede moverse a sí misma/descendientes
│  [carpeta] Freelance              │
│                                  │
│  [  Cancelar  ]  [   Mover   ]  │
└─────────────────────────────────┘
```

Mismo patrón para "Mover tarea a…". Fila de árbol: 44px alto, indentación 16px/nivel, carpeta destino actual resaltada en `accent` al seleccionar.

## Confirmación de borrado de carpeta

```
┌─────────────────────────────────┐
│  ¿Eliminar "Cliente X"?          │
│                                  │
│  Esto borrará 3 subcarpetas y    │
│  12 tareas. Podés deshacerlo     │
│  desde la próxima notificación.  │
│                                  │
│  [  Cancelar  ]  [ Eliminar ]   │  botón destructivo en overdue
└─────────────────────────────────┘
```

Es el único flujo con confirmación modal explícita (spec §11.6: solo acciones destructivas de alto impacto); borrar una tarea individual usa directamente el toast de Undo, sin este diálogo.

## Estado vacío

Dentro de una carpeta sin subcarpetas ni tareas:

```
┌─────────────────────────────────┐
│                                  │
│      [carpeta-abierta] (ícono)   │
│   Todavía no hay nada acá.        │  body, text-secondary
│   Tocá + para crear una tarea.    │
│                                  │
└─────────────────────────────────┘
```

Centrado vertical y horizontalmente en el área de contenido, texto `body` en `text-secondary`, sin botón adicional (refuerza el FAB/botón de creación ya visible).
