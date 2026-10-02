# Fase 3 — Carpetas

**Estado:** ✅ Hecha (2026-10-01)

## Qué se hizo (FOL-1 a FOL-8)
- Crear carpeta (raíz o subcarpeta) con nombre obligatorio y color opcional (10 tokens).
- Editar nombre y color; borrar con confirmación que indica cuántas subcarpetas y tareas contiene, y aviso con "Deshacer" que restaura exactamente lo que se borró.
- Mover a otra carpeta o a la raíz con selector en árbol y búsqueda; la carpeta misma y sus descendientes aparecen deshabilitados (además el trigger de la base impide ciclos).
- Reordenar hermanas: arrastrar desde el asa (mouse, touch y teclado) y Subir/Bajar en el menú.
- Navegación: tocar entra; breadcrumb clickeable (abreviado en mobile); botón volver; botón atrás de Android sube un nivel.
- Cada fila: punto de color, nombre, pendientes (incluye subcarpetas) e ícono de vencidas.
- Dentro de una carpeta: subcarpetas arriba con "+ Subcarpeta", tareas abajo. Estados vacíos con guía.
- Barra lateral (≥ 768px): árbol plegable con conteos, punto rojo si hay vencidas, carpeta actual resaltada y botón para crear carpetas en la raíz.

## Cómo probar
Crear varias carpetas anidadas, moverlas, reordenarlas, borrar una con contenido y deshacer. Probar sin conexión.

## Pendiente / notas
- Selector "Mover a…" sin ramas plegables (DECISIONS X41).
