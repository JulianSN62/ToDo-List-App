# Fase 9 — Archivos y fotos adjuntos

**Estado:** ✅ Hecha la parte web (2026-10-02), en el **Bloque 5** (X96). Decisiones X97–X104.

- **Bloque 8 (2026-10-05, X127):** **"+ Foto"** con la cámara, probado en tu celular. Una foto sacada en modo avión quedó "Se sube cuando haya conexión" y se subió al volver la red. Visor, links y menú de compartir también probados.
- **Lo que tenés que hacer vos (opcional):** mirar en Supabase → Storage que aparezcan tus archivos y abrir una tarea con adjuntos desde la otra plataforma (pasos abajo).

## Cámara (Bloque 8, X127)
- **"+ Foto"** junto a "+ Link" y "+ Archivo". Aparece en la app de Android y en el navegador con pantalla táctil, no en la PC.
- En Android abre la app de cámara del teléfono, sin pedir el permiso de cámara. La foto se copia a la app y se borra la copia temporal.
- Se llama `foto-AAAA-MM-DD-HHmmss.jpg` y pasa por la compresión de siempre. En el celular, una foto de varios MB quedó en 215 KB.
- **Código:** `takePhoto` en `src/platform/web/files.ts` y `src/platform/capacitor/files.ts`, `AttachmentsField.tsx`, `<queries>` en `AndroidManifest.xml` y `camera` en `file_paths.xml`.
- **Tests:** `TaskForm.test.tsx` (el botón solo con pantalla táctil, el nombre, cancelar y error) y `e2e/attachments.spec.ts` (`accept` y `capture` en mobile; sin botón en desktop).

## Qué se hizo

### Adjuntar archivos (spec 10.2, X97)
- **Agregar:** en la ventana de la tarea, "Adjuntos" tiene **+ Link** y **+ Archivo**. Se pueden elegir varios archivos a la vez, de cualquier tipo.
- **Cuándo queda adjuntado:** al tocar **Crear** o **Guardar**, igual que los links. Hasta entonces se ve "Se adjunta al guardar", y "Cancelar" los descarta. También funciona en "Nueva tarea" y con "Crear y agregar otra".
- **Fotos:** se comprimen antes de adjuntarlas (X101):
  - Lado mayor de 1600 px y calidad 0,8.
  - JPEG queda en JPEG; PNG y WebP pasan a WebP.
  - Si la versión comprimida no es más liviana, se adjunta la original.
- **Límite de 10 MB por archivo,** controlado después de comprimir. Si un archivo lo supera, aparece "«x» pesa 10,5 MB. El límite es 10 MB por archivo." y ese archivo no se agrega.
- **Lista:** cada archivo muestra:
  - Miniatura (fotos) o ícono (PDF y otros), nombre y tamaño.
  - Su estado: "Pendiente de subir" ("Se sube cuando haya conexión" si no hay red), "Subiendo…", "No se pudo subir" con **Reintentar**, o "En la nube" si no está guardado en este dispositivo.
  - Se ve en la ventana y en los detalles desplegados de la fila. El contador de adjuntos de la fila suma links y archivos.
- **Quitar:** la X de cada archivo. Se aplica al guardar y es un borrado lógico, como en los links.

### Abrir archivos (X97, X102, X104)
- **Según el tipo:**
  - **Fotos:** visor dentro de la app, con "Descargar".
  - **PDF:** pestaña nueva. Se probó en Edge con la CSP de la app. Si el navegador bloquea la ventana, se descarga.
  - **El resto:** se descarga. Nunca se abre en la app, por seguridad.
- **Si no está en el dispositivo,** se descarga de Storage con una **URL firmada de 60 s** y queda guardado para verlo sin conexión. Las fotos de una tarea se bajan solas al mostrarla, para la miniatura; los demás archivos, recién al abrirlos.
- **Avisos:**
  - Sin conexión, para un archivo que no está en el dispositivo: "Sin conexión: este archivo todavía no está guardado en este dispositivo."
  - Si el otro dispositivo todavía no terminó de subirlo: "Este archivo todavía se está subiendo desde otro dispositivo."

### Subida sin conexión (X98–X99)
- Al guardar, el archivo se guarda primero en el dispositivo (IndexedDB) y la fila queda **pendiente**.
- La **cola de subida** lo sube a Storage cuando hay conexión:
  - Va de a uno, en orden.
  - Arranca con la sesión y se despierta al volver la red o la pestaña.
  - Reintenta sola los errores pasajeros: 5 s, 15 s, 30 s, 1 min y después cada 2 min.
  - Un error permanente (por ejemplo, permisos) deja el archivo con **Reintentar**.
- Se eligió una cola propia en lugar del `AttachmentQueue` de PowerSync, que todavía es experimental (X98).
- Los archivos sin subir cuentan como **cambios pendientes**: en el indicador de sincronización y en el aviso de "Cerrar sesión".

### Espacio (Ajustes → Datos, X97)
- **"Archivos adjuntos":**
  - Cuánto ocupan en la nube, frente al 1 GB del plan gratuito de Supabase (verificado el 2026-10-02).
  - Cuánto ocupan en este dispositivo.
- **"Liberar espacio":** con confirmación, borra del dispositivo los archivos que ya están en la nube. Los que no se subieron se conservan.

### Limpieza y borrado (X100, X103)
- **Al cerrar sesión:** se borran los archivos del dispositivo y su estado local.
- **Al abrir la app:** se borran del dispositivo los archivos de adjuntos que ya no existen o se eliminaron.
- **Limpieza local por retención:** ahora borra también los archivos de las tareas vencidas. Antes solo borraba sus links.
- **Servidor (migración nueva `supabase/migrations/20261003120000_attachment_files.sql`):**
  - **Restricciones** para las filas de archivos: nombre, tipo, tamaño y la ruta exacta `{owner_id}/{task_id}/{id}-{nombre}`.
  - **Papelera de Storage:** cuando una fila de archivo se borra de verdad, su ruta queda anotada y la limpieza diaria borra el archivo con la API de Storage.
  - **Corrige un problema:** al borrar una tarea desde la app, el archivo quedaba huérfano en Storage.
  - Lo eliminado con "Deshacer" disponible (borrado lógico) se sigue purgando a los 30 días, como antes. La Edge Function no cambia.

### Código
- **Lógica pura con tests:**
  - `src/lib/files.ts`: límite, nombres, ruta, plan de compresión y tamaños.
  - `src/lib/uploadQueue.ts`: estados y reintentos.
  - `src/lib/taskForm.ts`: archivos como borrador hasta Guardar.
- **Plataforma:**
  - `src/platform/web/files.ts`: selector, descarga y PDF.
  - `src/platform/web/images.ts`: compresión.
  - `src/platform/web/fileStore.ts`: IndexedDB.
  - `src/platform/capacitor/files.ts`: Android, sin probar.
- **Datos:**
  - `src/data/repositories/attachmentRepo.ts`, `src/data/fileStorage.ts` (Storage) y `src/data/fileSync.ts` (cola).
  - Tabla local `attachment_local_state` en `src/data/schema.ts`.
  - Consultas `useTaskFiles`, `useFileStorageUsage` y `usePendingFileCount`.
- **Interfaz:**
  - `src/features/attachments/` (`AttachmentsField`, `FileList`, `ImageViewer`, `BlobImage`).
  - `src/features/settings/FilesStorageSetting.tsx`.

## Verificación
- `npm run lint`, `npm run typecheck`, `npm test` y `npm run build`: sin errores.
  - **211 tests** en 31 archivos.
  - Incluye la migración nueva sobre Postgres real (PGlite) en `supabase/tests/attachmentFilesSql.test.ts`.
- `npm run e2e`: **64 de 64** en verde. Hay 10 nuevos en `e2e/attachments.spec.ts`, con Storage ficticio: los pedidos al Supabase de prueba se responden desde el test. Prueba:
  - Adjuntar al crear y ver el contador.
  - La compresión de una foto de 4000×3000 a 1600×1200.
  - El rechazo de 10,5 MB.
  - El error y "Reintentar".
  - "Liberar espacio", la descarga con URL firmada y el visor.
  - Ver sin conexión lo ya abierto.
  - El aviso de un PDF no guardado.
  - Quitar un archivo.
  - Cerrar sesión, que vacía IndexedDB.
- Capturas nuevas en `e2e/screens.spec.ts` (`ventana-archivos`, `tareas-archivos`, `ajustes-datos`), revisadas a 390 px y 1280 px, en claro y oscuro.
- PDF en pestaña nueva comprobado a mano con Edge real (con ventana) y la CSP de producción.
- `npm run android:build`: el APK de debug sigue compilando. No se probó en el celular (X84).

## Lo que tenés que hacer vos
1. ✅ **Hecho (2026-10-02).** Supabase → SQL Editor, de a una y en este orden (`docs/SETUP.md`, paso 12.2):
   1. `supabase/migrations/20261002120000_cleanup_functions.sql`, si todavía no la corriste.
   2. `supabase/migrations/20261003120000_attachment_files.sql`.

   La segunda usa las funciones de la primera. Corrida sola da `schema "private" does not exist`, o ahora un aviso de qué falta; en los dos casos no cambia nada y se puede volver a correr. El resto del paso 12 (Edge Function, Vault y la tarea diaria) se puede hacer después.
2. **Probar con tu cuenta** (`npm run dev`):
   1. Adjuntá una foto y un PDF a una tarea.
   2. Comprobá que en Supabase → Storage → `attachments` aparecen dentro de tu carpeta.
   3. Abrí la misma tarea en otro navegador: la foto se descarga para la miniatura y el PDF se abre al tocarlo.
   4. Sin conexión (modo avión o desconectando la red), adjuntá un archivo y volvé a conectar: tiene que pasar de "Pendiente de subir" a listo.
   5. Para ver la limpieza de Storage (necesita el paso 12 completo: Edge Function, Vault y tarea diaria): poné la retención en 1 día y completá una tarea con un archivo. Pasados dos días (la app la borra al abrirse y la limpieza diaria vacía la papelera), el archivo ya no está en Storage. Una tarea **eliminada** tarda más: se purga a los 30 días, porque hasta entonces se puede recuperar.
