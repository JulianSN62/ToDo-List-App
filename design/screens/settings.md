# Ajustes

Fuente: spec §7.7 (SET-1–9), §8–9 (datos que estas pantallas controlan).

## Pantalla principal de Ajustes

```
┌─────────────────────────────────┐
│  Ajustes                         │  title-md (mobile) / title-lg (desktop)
├─────────────────────────────────┤
│  Apariencia                      │  caption, text-secondary (encabezado de grupo)
│  [paleta] Tema            Sistema›│
├─────────────────────────────────┤
│  Tareas                          │
│  [papelera] Retención de completadas 7d› │
│  [campana] Alertas de vencimiento [NATIVE]›│
│  [tag] Tags                     › │
├─────────────────────────────────┤
│  Datos                           │
│  [descargar] Exportar backup (JSON)│
│  [nube] Sincronización   Sinc. ✓ │
├─────────────────────────────────┤
│  Diagnóstico [NATIVE]            │
│  [campana] Notificaciones       › │
├─────────────────────────────────┤
│  Cuenta                          │
│  [usuario] cuenta@email.com     › │
│  Cerrar sesión                   │
├─────────────────────────────────┤
│  Acerca de               v1.0.0  │
└─────────────────────────────────┘
```

**Medidas:** lista de filas tipo "settings", 56px alto cada una (mobile) / 48px (desktop), ícono 20px + label `body` + valor actual a la derecha en `text-secondary` + chevron 16px si navega a subpantalla. Agrupadas por secciones con encabezado `caption` en mayúscula sutil. En desktop esta pantalla ocupa la columna central (o un layout de 2 columnas: lista de secciones a la izquierda + detalle de la sección a la derecha, reutilizando el patrón del panel de 400px).

## Tema

```
┌─────────────────────────────────┐
│ [<]  Tema                        │
│                                  │
│  (●) Sistema                     │
│  ( ) Claro                       │
│  ( ) Oscuro                      │
└─────────────────────────────────┘
```
Radio list, filas de 48px, selección inmediata (sin botón "Guardar"). Preferencia **por dispositivo** (S5) — no sincroniza entre web y Android.

## Retención de completadas

```
┌─────────────────────────────────┐
│ [<]  Retención de completadas    │
│                                  │
│  Las tareas completadas se       │
│  borran automáticamente después  │
│  de:                             │
│                                  │
│  [ −  ]      7 días      [  +  ] │  stepper, rango 1–90, default 7
└─────────────────────────────────┘
```
Stepper con botones 48×48, valor central `title-md`. Rango 1–90 (S1).

## Alertas de vencimiento [NATIVE — Android]

```
┌─────────────────────────────────┐
│ [<]  Alertas de vencimiento       │
│                                  │
│  Activar alertas          [▢ ON]│
│                                  │
│  Avisar:                         │
│  [x] El mismo día                 │
│  [x] 1 día antes                  │
│  [ ] 2 días antes                 │
│  [ ] 3 días antes                 │
│  [ ] 1 semana antes               │
│                                  │
│  Hora del aviso         09:00  › │
└─────────────────────────────────┘
```
Checkboxes multi-select 48px alto c/u, corresponden a offsets `[0,1,2,3,7]` días (S3). Selector de hora abre un time picker nativo. No se muestra esta pantalla completa en desktop/web — en su lugar, Ajustes muestra un único ítem informativo: "Alertas de vencimiento — disponible en la app de Android".

## Gestión de Tags

```
┌─────────────────────────────────┐
│ [<]  Tags                    +  │
│                                  │
│  ● Urgente                  [⋮] │
│  ● Freelance                [⋮] │
│  ● Facultad                 [⋮] │
└─────────────────────────────────┘
```
Fila 48px: punto de color 12px + nombre + menú de más opciones (Renombrar, Cambiar color, Eliminar). Botón "+" en el header crea un tag nuevo (nombre único sin distinguir mayúsculas, color de los 10 tokens).

## Exportar backup (JSON)

Botón único en Ajustes → genera `todo-list-respaldo-YYYY-MM-DD.json`. Mobile: usa el share sheet nativo (Filesystem + compartir). Web: descarga directa (Blob). Tras exportar, un toast confirma "Backup exportado" con el nombre del archivo.

## Diagnóstico de notificaciones [NATIVE — Android]

```
┌─────────────────────────────────┐
│ [<]  Notificaciones               │
│                                  │
│  Permiso de notificaciones  [✓] │
│  Alarmas exactas            [✓] │
│  Optimización de batería    [!] │  advertencia si puede matar el proceso en background
│                                  │
│  [  Enviar notificación de prueba ] │
└─────────────────────────────────┘
```
Cada fila 48px con un ícono de estado ([✓] verde `completed` / [!] ámbar `priority` / [x] `overdue`) a la derecha. No existe en web/desktop.

## Cuenta

```
┌─────────────────────────────────┐
│ [<]  Cuenta                      │
│                                  │
│  Email           cuenta@mail.com│
│                                  │
│  [      Cerrar sesión       ]   │  destructivo, color overdue
└─────────────────────────────────┘
```
Solo email + "Cerrar sesión" — sin contraseña que cambiar, el acceso es siempre por email + código enviado al correo (ver [`auth.md`](./auth.md)). "Cerrar sesión" limpia la base local por defecto (spec AUTH).

*(Futuro, fuera de v1: si la app se comparte con otros usuarios, esta sección sumará una opción para crear cuentas nuevas desde Configuración, manteniendo el mismo login passwordless.)*

## Sincronización

Fila con el mismo [indicador de sync](./navigation.md#componente-indicador-de-sync-todas-las-plataformas) usado en el header, más un botón "Sincronizar ahora" (48px, secundario) que fuerza un intento de sync inmediato.
