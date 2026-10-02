# Fase 4 — Tareas (núcleo)

**Estado:** ✅ Hecha (2026-10-01) · Ajustada el mismo día tras las primeras pruebas del usuario (ver abajo).

## Qué se hizo (TSK-1 a TSK-9, sin etiquetas ni adjuntos)
- ~~**Creación rápida:** panel inferior (mobile) o fila fija arriba de la lista (desktop), Enter crea y deja el campo listo.~~ Reemplazada por la ventana de tarea (ver "Ajustes").
- **Lista:** franja de color, asa, casilla, título, estrella de prioridad, fecha relativa (Hoy, Mañana, Ayer, Vencida hace N días; vencidas en rojo suave) e indicador de anclada.
- **Orden:** prioritarias arriba sin tocar la posición guardada (al quitar la prioridad vuelve a su lugar); reordenar arrastrando o con Subir/Bajar dentro de su grupo.
- **Completar** con la casilla o deslizando a la derecha (mobile); **eliminar** deslizando a la izquierda o desde el menú, con "Deshacer". Los gestos no arrancan en los bordes (gesto atrás de Android).
- ~~**Detalle:** bottom sheet, panel lateral o tercera columna fija con guardado automático.~~ Reemplazado por la ventana de tarea (ver "Ajustes").
- **Mover a otra carpeta:** queda al final de la carpeta destino.
- **Completadas:** sección colapsada con contador, "Se borra en N días" y opción de desmarcar (vuelve a su posición original).
- **Limpieza al abrir:** borra las completadas que superaron la retención (solo si la configuración ya se descargó).
- Ruta `/task/:id` (sirve de deep link para las notificaciones de la Fase 8).

## Ajustes del 2026-10-01 (pedido del usuario; decisiones X51–X57)
- **Ventana de tarea** (`src/features/tasks/TaskForm.tsx` y `TaskFormSheet.tsx`): modal que bloquea la app; bottom sheet alto en mobile, centrado de 600px en desktop. Mismos campos para crear y editar: título (obligatorio), descripción, fecha límite con atajos, prioridad, color y carpeta ("Cambiar"). Etiquetas, Adjuntos, Recordatorios y Anclar se ven bloqueados hasta sus fases.
  - Crear: "Crear" (guarda y cierra) y "Crear y agregar otra" (vacía título y descripción, conserva el resto). Enter en el título o Ctrl/⌘+Enter = "Crear".
  - Editar: "Guardar" escribe solo lo que cambió y mueve la tarea si cambió la carpeta; "Eliminar tarea" con "Deshacer". Cerrar con cambios sin guardar pide confirmar.
  - Se quitaron la creación rápida inline, el panel de creación rápida, el panel de detalle y la tercera columna.
- **Filas expandibles:** la flecha de cada tarea despliega descripción completa, fecha larga ("sábado 3 de octubre · Mañana"), prioridad, color y botón "Editar". Varias a la vez; se recuerdan durante la sesión.
- **Carpeta sin tareas:** mensaje "Esta carpeta no tiene tareas." con la guía para crear una (también si tiene subcarpetas).
- **Volver:** Ajustes, Hoy y Buscar tienen flecha para volver a Carpetas.
- Lógica pura nueva con tests: `src/lib/taskForm.ts` (validación, cambios a guardar, cambios sin guardar) y `formatLongDate` en `src/lib/dates.ts`.

## Cómo probar
Crear una carpeta y ver el mensaje de vacía. "Nueva tarea" (desktop) o "+" (mobile): cargar todos los campos, probar "Crear y agregar otra" y "Crear", y dejar el título vacío para ver el aviso. Desplegar varias tareas con la flecha. Tocar el título para editar, cambiar la carpeta, cerrar con cambios (pide confirmar) y guardar. Eliminar y deshacer. Entrar a Ajustes y volver con la flecha. Repetir sin conexión.

## Pendiente / notas
- Indicadores de etiquetas y adjuntos en la fila → Fases 5 y 9.
- Duplicar tarea: fuera de la v1 (TSK-10).
- Atajo de teclado `N` para "Nueva tarea" → Fase 7.
