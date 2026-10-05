# Fase 8 — Android y notificaciones

**Estado:** ✅ Hecha en código y probada en el **emulador** (Bloque 7, 2026-10-04, versión 0.10.0). Falta probarla en tu celular (Android 12), en el Bloque 8.

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

## Lo que tenés que hacer vos (Bloque 8, en el celular)
1. Instalar el APK nuevo (`npm run android:build`, ver `docs/SETUP.md` paso 9) e iniciar sesión.
2. En Ajustes → Notificaciones, comprobar que todo esté en verde y mandar la notificación de prueba. Si la batería sale con advertencia, seguir la guía.
3. Lista del spec 15.2:
   - un recordatorio con dos fechas cercanas, con la app cerrada y sin internet;
   - una tarea anclada: intentar deslizarla (en Android 12 no se debería poder), desanclarla y completarla;
   - reiniciar el celular y ver que vuelven la anclada y los avisos pendientes;
   - cambiar la hora de las alertas y la fecha de una tarea;
   - el modo ahorro de batería.
4. Crear un recordatorio **desde la PC** y abrir la app en el celular: se programa al abrirla.

## Cómo probar
`npm run android:build` → instalar el APK → iniciar sesión. Para el emulador, ver `docs/SETUP.md` (paso 9, "Probar en un emulador").
