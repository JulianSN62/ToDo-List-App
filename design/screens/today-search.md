# Hoy / Upcoming y Buscar

Fuente: spec §7.5 (vistas globales), §7.6 (SRC-1–4).

## Hoy (mobile y desktop — mismo contenido, desktop en la columna central del layout de 3 columnas)

```
┌─────────────────────────────────┐
│  Hoy              [★]Solo [▢]   │  title-md + filtro "Solo prioritarias" (chip toggle)
├─────────────────────────────────┤
│ Vencidas (2)                     │  encabezado de grupo, color overdue
│ ┃☐ Pagar hosting                 │
│    Cliente X › Proyecto          │  caption text-secondary: path de carpeta
│ ┃☐ Enviar informe                │
│    Universidad › Taller          │
├─────────────────────────────────┤
│ Hoy (1)                          │
│ ┃☐ [★] Enviar factura            │
│    Cliente X                     │
├─────────────────────────────────┤
│ Mañana (1)  ·  Esta semana (3)  ·  Más adelante (5)   │  grupos colapsables, igual patrón
└─────────────────────────────────┘
```

**Medidas:** mismo componente de fila que en Carpetas/Tareas (56px mobile / 48px desktop), con una segunda línea `caption` debajo del título mostrando el path completo de la carpeta (ej. "Cliente X › Proyecto") ya que la vista cruza carpetas. Encabezado de grupo: `title-sm`, 40px alto, con contador entre paréntesis. "Vencidas" siempre primero y en tono `overdue` (rojo suave) tanto en el texto del encabezado como en la franja/chip de fecha de cada fila. El filtro "Solo prioritarias" es un chip toggle en el header (mismo componente que en vista de carpeta) y aplica a todos los grupos.

Grupos: **Vencidas → Hoy → Mañana → Esta semana → Más adelante**, en ese orden fijo; un grupo sin tareas no se muestra.

## Buscar

```
┌─────────────────────────────────┐
│ [buscar] Buscar tareas...        │  input 48px, autofocus al entrar a la pantalla
│                                  │
│ ┃☐ Revisar contrato con client. │  resultado: misma fila que en Tareas
│    Cliente X › Proyecto [tag]Urgente│  path de carpeta + tags en caption
│ ┃☑ Factura de marzo (completada) │  estado visible (tachado si completada)
│    Cliente X                     │
│                                  │
│  (debounce corto, sin spinner:   │
│   búsqueda local instantánea)    │
└─────────────────────────────────┘
```

**Medidas:** input de búsqueda 48px alto, `radius-sm`, ícono lupa 20px a la izquierda, botón "x" para limpiar a la derecha (aparece solo con texto). Resultados con el mismo componente de fila que el resto de la app (consistencia), agregando el path de carpeta y tags coincidentes en una segunda línea `caption`. Busca en título, descripción y nombres de tag — coincidencia sin distinguir mayúsculas/acentos. En desktop, accesible también con `Ctrl+K` / `/` (abre como overlay centrado de 600px de ancho en vez de pantalla completa, mismo contenido). Sin estado de carga visible: al ser local, los resultados aparecen de inmediato tras un debounce corto.

### Estado vacío de búsqueda
Texto centrado `body`/`text-secondary`: "No encontramos tareas para «…»" — mismo tratamiento que el estado vacío de carpetas.
