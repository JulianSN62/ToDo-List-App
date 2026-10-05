# Fase 8 — Android y notificaciones

**Estado:** ✅ Hecha y **probada en tu celular** (Bloque 8, 2026-10-05): moto g71 5G, Android 12, WebView 153. Versión **1.0.0** firmada e instalada.

## Base (2026-10-01)
- Capacitor 8 configurado (`capacitor.config.ts`): `appId` `com.todolistapp.app`, nombre "ToDo List", esquema `https`, sin contenido mixto.
- Proyecto `android/` generado con los plugins: App, Preferences, Keyboard, SplashScreen, SQLite (Capacitor Community) y PowerSync.
- Pantalla de borde a borde con el plugin **SystemBars** del core (áreas seguras vía CSS) y estilo de barras acorde al tema.
- Botón atrás: cierra paneles → sube de carpeta → vuelve al inicio → minimiza la app.
- Teclado: el WebView se achica para no tapar campos; el botón flotante se oculta con el teclado abierto.
- Seguridad: `allowBackup=false`, reglas de extracción que excluyen todos los datos de copias y transferencias, sin tráfico http.
- Íconos adaptativos y splash generados (`npm run icons`).
- Script `npm run android:build` (busca un JDK 21 y compila).
- **Bloque 6 (X114):** APK de release firmado con `npm run android:release` (keystore fuera del repositorio, ver `docs/SETUP.md` paso 9); `versionName` y `versionCode` salen de `package.json`; `file_paths.xml` comparte solo `exports/` y `attachments/` de la caché.

## Notificaciones (Bloque 7, decisiones X116–X125)

### Qué se hizo
- **Recordatorios personalizados (spec 9.7):** sección "Recordatorios" en la ventana de la tarea y "Agregar recordatorio" en el menú "⋯".
  - Mensaje opcional y hasta 10 fechas y horas; no acepta fechas pasadas.
  - Cada fecha avisa una vez y después se borra; un recordatorio sin fechas desaparece.
  - En la fila, una campana con la cantidad; en los detalles, las próximas fechas.
- **Tareas ancladas (spec 9.6, Opción 2):** interruptor "Anclar tarea" en la ventana y "Anclar/Desanclar" en el menú.
  - La notificación fija la publica un plugin propio (`PinnedNotifications.java`).
  - Vuelve sola si se descarta, al reiniciar el teléfono y al actualizar la app.
  - Tocarla abre la tarea y la notificación queda. Completar o desanclar la quita.
- **Avisos de vencimiento (spec 6.6):** se programan con la configuración de Ajustes → Alertas.
- **Reconciliación (spec 9.4):** `src/lib/notificationPlan.ts` (lógica pura con tests) + `src/data/notificationSync.ts` + tabla solo local `notif_registry`. Corre al iniciar, al volver a la app, con cada cambio (también los que llegan por sincronización) y cuando se dispara un aviso.
  - Ventana de 60 días y máximo 200.
  - Reprograma todo al abrir la app y al cambiar el permiso de alarmas exactas.
- **Permisos (spec 9.5):** se piden al activar las alertas, agregar un recordatorio o anclar. Si se niegan, un aviso lleva al Diagnóstico.
- **Diagnóstico (SET-6):** Ajustes → Notificaciones (solo Android).
  - Permiso, alarmas exactas y batería, con acceso a cada ajuste del sistema.
  - Guía de batería, notificación de prueba y lista de ancladas para desanclar.
  - Plugin propio `DeviceSettings` para la batería.
- **Canales:** `due_alerts`, `reminders` (con sonido) y `pinned` (silencioso). Ícono propio (la tilde) con el color de acento.
- **Tocar una notificación** abre `/task/:id`, también con la app cerrada.
- **Cerrar sesión** cancela y quita todo, incluida la lista guardada de ancladas.
- **En la web** recordatorios y anclado se editan igual (X117), con la nota de que los avisos llegan en la app de Android.
- **WebView viejo (X125):** si el navegador no alcanza (Chrome < 111), en vez de una pantalla en blanco se ve "Hay que actualizar el navegador".

### Probado en el emulador (Android 14, con tu cuenta real)
- Pedido del permiso de notificaciones y "Alarmas exactas" desde el Diagnóstico (abre la pantalla correcta del sistema). Con el permiso negado para siempre, "Permitir" abre los ajustes de la app.
- Recordatorio con dos fechas: llegó a las 21:23:02 y a las 21:24:03, con la app en segundo plano, **sin conexión** (modo avión) y con el proceso de la app cerrado.
- Aviso de vencimiento "Vence hoy" a la hora configurada, con alarma exacta.
- **Reinicio** (apagado normal) sin abrir la app: la anclada volvió y el aviso pendiente salió a las 21:43:01, a la hora justa.
- Tocar un recordatorio y tocar la anclada abren la tarea. Deslizar la anclada (Android 14 lo permite): vuelve enseguida.
- Desanclar, volver a anclar y completar la tarea anclada. Notificaciones desactivadas: no se programa nada y el Diagnóstico lo explica.
- Cerrar sesión: no quedan notificaciones, alarmas ni ancladas guardadas.
- Los datos de prueba se borraron y las alertas volvieron a tu configuración (09:00, 1 día antes y el mismo día).
- **Android 12 en el emulador:** su WebView (91) es muy viejo para la app. Ahí se comprobó el aviso "Hay que actualizar el navegador".

## Bloque 8 — en tu celular (2026-10-05, X126)
Probado por cable: Claude manejó la app desde la PC (Playwright `_android` sobre el APK de debug, `adb` y `uiautomator`) y vos hiciste lo físico. Evidencia con `dumpsys alarm`, `dumpsys notification` y capturas.

**Lista del spec 15.2**
- **Avisos con la app cerrada y sin internet:** recordatorio con dos fechas (11:59 y 12:01) y aviso de vencimiento (12:03) en modo avión, con la app cerrada desde Recientes: llegaron los tres a la hora justa. Tocarlos abre la tarea. Al dispararse la última fecha, el recordatorio desaparece solo.
- **Anclada:** no se puede deslizar ni sacar con "Borrar todo" (Android 12). Completarla (deslizando la fila) la quita.
- **Reinicio** (`svc power reboot`), sin abrir la app: la anclada volvió y el recordatorio de las 12:17 llegó a las 12:17:00. La sesión sigue abierta.
- **Actualizar la app** (`adb install -r`): la anclada vuelve sola.
- **Reprogramación:** cambiar la hora de las alertas (a 12:40) y la fecha de una tarea (a dos días) reemplaza las alarmas exactas en el sistema.
- **Permisos:**
  - Notificaciones desactivadas: el Diagnóstico muestra la cruz roja y "Abrir ajustes" lleva a la pantalla de Android. No se programa nada y la anclada se quita. Al reactivarlas se reprograma todo.
  - Sin alarmas exactas: Android cierra la app y borra sus alarmas. Al abrirla se reprograman inexactas (ventana de hasta una hora) y el Diagnóstico lo explica. Su botón abre "Alarmas y recordatorios".
- **Ahorro de batería:** el recordatorio llegó a la hora justa (12:36:00).
- **Notificación de prueba:** llega con el ícono y el color de la app.

**Además**
- **Gestos:** deslizar a la derecha completa y a la izquierda elimina con "Deshacer". Un deslizamiento desde el borde usa el gesto de volver de Android y no toca la tarea.
- **Teclado:** no tapa el campo y los botones quedan arriba.
- **Botón atrás:** cierra el teclado, pide confirmar si hay cambios, sube de carpeta y minimiza desde el inicio.
- **Otras pantallas:** tema claro y oscuro, vista horizontal (barra lateral), visor de fotos, links en Chrome (Custom Tab) y respaldo con el menú de compartir.
- **Correcciones (X128–X130):**
  - pantalla de borde a borde (las barras se veían grises);
  - permiso `ACCESS_NETWORK_STATE`;
  - canal "Default" renombrado "Otras";
  - texto de alarmas exactas;
  - estado "En la nube" que se veía un momento.

## Cómo probar
`npm run android:build` → instalar el APK → iniciar sesión. Para el emulador, ver `docs/SETUP.md` (paso 9, "Probar en un emulador").
