# Decisiones del proyecto

Decisiones tomadas durante el desarrollo que no estaban cerradas en `docs/specs-and-design.md`, o que lo ajustan. Las más recientes van al final.

## 2026-10-01 — Primera tanda de desarrollo

### Alcance y forma de trabajo
| # | Decisión | Motivo |
|---|---|---|
| X1 | Primera tanda: Fases 0 a 4 (núcleo) + PWA (parte de la Fase 7) + base de Android (parte de la Fase 8). El resto se hace después, de a una funcionalidad. | Pedido del usuario: que web, PWA y Android funcionen ya, con la base creada y conectada. |
| X2 | **No se usa git** hasta que el usuario lo indique. Solo se deja el `.gitignore`. | Pedido del usuario. |
| X3 | Registro de avance por fase en `docs/progress/`. | Pedido del usuario. |

### Identidad y despliegue
| # | Decisión | Motivo |
|---|---|---|
| X4 | `appId`: `com.todolistapp.app`. Nombre visible: **ToDo List** (debajo del ícono y en la PWA instalada; no aparece dentro de la app). | Elegido por el usuario. Centralizado en `src/config/app.ts` y `capacitor.config.ts`. |
| X5 | Hosting de la web: **Netlify** (`netlify.toml`). El dominio personalizado se agrega después; nada del código depende del dominio. | Elegido por el usuario. |
| X6 | Ícono provisorio neutro (tilde blanca sobre el color de acento). Se regenera con `npm run icons` cuando haya uno definitivo. | Hace falta un ícono de lanzador; el diseño no define logo. |

### Stack y versiones (verificadas el 2026-10-01)
| # | Decisión | Motivo |
|---|---|---|
| X7 | **TypeScript 6.0** (no 7). | `typescript-eslint` 8.71 soporta TypeScript `< 6.1`. |
| X8 | React 19.3, Vite 8, React Router 8 (`RouterProvider` desde `react-router/dom`), Tailwind 4, Capacitor 8, Vitest 5, zod 4. | Últimas versiones estables compatibles entre sí. |
| X9 | Fuente Inter **empaquetada** con `@fontsource-variable/inter` (no Google Fonts). | Funciona offline, sin pedidos a terceros y compatible con la CSP. |
| X10 | Componentes base con el patrón de shadcn/ui (Radix + `cva` + `cn`) escritos a mano en `src/ui/`, sin la CLI. | La CLI reescribe el CSS con su propia paleta; acá la única fuente de colores es `design/tokens.css`. |
| X11 | Tailwind sin paleta por defecto; utilidades propias que apuntan a los tokens: `bg-app`, `bg-panel`, `border-line`, `text-fg`, `text-muted`, `bg-brand`/`text-on-brand`, `text-danger`, `text-star`, `text-success`, `bg-user-<token>` y tamaños `text-caption`, `text-body-sm`, `text-body`, `text-title-sm/md/lg`. `tailwind-merge` está configurado para reconocer esos tamaños (`src/lib/cn.ts`). | Imposible usar un color fuera del diseño. |
| X12 | `@capacitor/status-bar` no se usa: Capacitor 8 trae el plugin **SystemBars** en el core (borde a borde y estilo de barras). | API vigente de Capacitor 8. |

### Datos y sincronización
| # | Decisión | Motivo |
|---|---|---|
| X13 | **PowerSync** (Camino A) con **Sync Streams** `edition: 3` (`powersync/sync-config.yaml`). | Las Sync Rules están deprecadas. |
| X14 | SDK `@powersync/capacitor` (beta): en Android usa SQLite nativo (`@capacitor-community/sqlite`); en navegador cae al SDK web (SQLite en WASM). | SDK oficial para Capacitor. Si diera problemas, el plan B es usar el SDK web dentro del WebView (cambio acotado a `src/data/db.ts`). |
| X15 | Claves nuevas de Supabase: **publishable key** en el cliente (`VITE_SUPABASE_PUBLISHABLE_KEY`). | Las claves `anon`/`service_role` se deprecan a fines de 2026. |
| X16 | Variables en **`.env`** (no `.env.local` como decía el spec) + `.env.example` documentado. | Pedido del usuario. Ambos patrones están en el `.gitignore`. |
| X17 | Al subir cambios, los errores permanentes de Postgres (`22xxx`, `23xxx`, `42501`, `42P01`, `42703`, `PGRST204`) **descartan** ese cambio y se registra solo tabla/operación/código (nunca datos). | Evita que la cola quede bloqueada para siempre (spec 8.2.4). |
| X18 | Booleanos: 0/1 en SQLite, convertidos a `true/false` al subir (`BOOLEAN_COLUMNS` en `src/data/schema.ts`). | Postgres espera booleanos. |
| X19 | "Deshacer" del borrado de carpetas compara `deleted_at` **por instante** y no por texto. | Al sincronizar, el servidor puede devolver la fecha con otro formato. |
| X20 | Limpieza local al abrir: solo borra completadas vencidas **si la configuración ya se descargó** del servidor. La purga de eliminados lógicos (30 días) queda para la tarea programada del servidor (Fase 6). | Con valores por defecto se podrían borrar tareas que el usuario quiere conservar más días. |
| X21 | Tablas solo locales (`notif_registry`, `attachment_local_state`) se definen en sus fases (8 y 9). | PowerSync exige `id` de texto en todas las tablas: `notif_registry` necesita rediseñar cómo genera el ID numérico de notificación. |

### Base de datos (migración inicial)
| # | Decisión | Motivo |
|---|---|---|
| X22 | **FKs compuestas** `(columna_id, owner_id)` hacia `(id, owner_id)`. | Ninguna fila puede referenciar datos de otro usuario (RLS no controla las FKs). |
| X23 | `position text collate "C"`. | Mismo orden que `fractional-indexing` (orden binario). |
| X24 | CHECK de longitudes (título 200, descripción 10 000, carpeta 100, etiqueta 50), colores dentro de los 10 tokens y formato de hora `HH:mm`. Los mismos límites en `src/lib/validation.ts`. | Integridad y defensa ante datos inválidos. |
| X25 | `grant select, insert, update, delete ... to authenticated` explícito y `revoke all ... from anon`. | No depender de los permisos por defecto del proyecto; sin sesión no hay acceso (verificado: la Data API responde 401/42501 sin sesión). |
| X26 | Rol `powersync_role` creado **sin contraseña** en la migración; la contraseña se asigna aparte en el SQL Editor. Publicación `powersync` solo con las 8 tablas y `select` solo sobre ellas. | Ningún secreto en el repositorio; mínimo privilegio. |
| X27 | Backfill de `user_settings` para usuarios creados antes de correr la migración. | El usuario puede crearse antes o después. |
| X28 | La tarea programada de limpieza (Edge Function + pg_cron) va en una migración nueva en la Fase 6. | Necesita la Edge Function desplegada y secretos en Vault. |

### Autenticación y sesión
| # | Decisión | Motivo |
|---|---|---|
| X29 | `signInWithOtp` con `shouldCreateUser: false`. Si el email no existe, la pantalla avanza igual al paso del código (no revela qué emails tienen cuenta). | Sin registro público + protección contra enumeración. |
| X30 | Apertura sin conexión: se guarda el último usuario conocido; si el token venció y no hay red, la app abre igual con los datos locales. Solo se cierra sesión con "Cerrar sesión" o si el servidor invalida la sesión. | `getSession()` de supabase-js devuelve `null` sin red cuando el token venció (verificado en su código). |
| X31 | "Cerrar sesión" solo en este dispositivo (`scope: 'local'`) y **borra la base local** (`disconnectAndClear`). Si hay cambios sin sincronizar, se avisa antes. Sin conexión, se borra la sesión guardada igual. | Spec AUTH-6 y 8.3; cerrar sesión en el celular no debe cerrar la de la PC. |
| X32 | Captcha preparado pero **apagado**: se activa solo si `VITE_CAPTCHA_SITE_KEY` tiene valor (Turnstile o hCaptcha). | Pedido del usuario (app personal, no pública). |
| X33 | Android guarda la sesión en `@capacitor/preferences` (SharedPreferences, sin cifrar). Se compensa con `allowBackup=false` y reglas de extracción que excluyen todos los datos de copias y transferencias. | Spec AUTH-5. Evaluar almacenamiento cifrado en la Fase 10. |

### Seguridad web
| # | Decisión | Motivo |
|---|---|---|
| X34 | **CSP** como meta tag generada en el build (`tooling/csp.ts`): solo el propio origen + URLs de Supabase/PowerSync del `.env` (+ captcha si está activo). Sirve igual en Netlify y en Android. Cabeceras extra en `netlify.toml`. | Mitiga XSS (la sesión web vive en `localStorage`). |
| X35 | El build **se cancela** si una variable `VITE_*` parece secreta (`sb_secret_`, JWT `service_role`, nombres con SECRET/PASSWORD) — `tooling/envGuard.ts`. | Evita publicar secretos por error. |
| X36 | `npm overrides`: `uuid ^11.1.1` para `xcode` (dependencia de la CLI de Capacitor, solo iOS). | Elimina la única vulnerabilidad reportada por `npm audit` (solo herramienta de desarrollo). |

### Interfaz
| # | Decisión | Motivo |
|---|---|---|
| X37 | Atajo "Próxima semana" = **próximo lunes**. | Convención habitual en apps de tareas. |
| X38 | Creación rápida: Enter vacía el campo al instante y guarda en orden; las opciones elegidas (fecha, prioridad, color) se mantienen entre tareas hasta cambiarlas. | Cargar listas largas rápido sin perder entradas. |
| X39 | Eliminar una tarea no cambia `is_pinned` (las notificaciones ignoran tareas eliminadas y "Deshacer" la deja como estaba). Completar sí la desancla. | Spec 6.3 y 6.5. |
| X40 | Hoy y Buscar se muestran como pantallas "Disponible próximamente" hasta la Fase 5. Recordatorios y anclado se ven bloqueados en el detalle hasta la Fase 8. | Alcance de esta tanda. |
| X41 | El selector "Mover a…" muestra el árbol completo con sangría y búsqueda (sin plegar ramas). | Suficiente para el volumen personal; plegable es una mejora posible. |
| X42 | Cerrar el detalle de una tarea vuelve atrás en el historial si se abrió desde la lista; si se llegó por link directo, va a la carpeta. | No llenar el historial con entradas repetidas. |

### Build, PWA y Android
| # | Decisión | Motivo |
|---|---|---|
| X43 | PWA con `registerType: 'prompt'` (aviso "Hay una nueva versión") y registro manual solo en navegador; nunca en Android. Se excluyen del precaché las variantes `mc-wa-sqlite*` (solo para cifrado). Precaché ≈ 5,3 MB. | Spec 12. |
| X44 | El bundle principal pesa ~1,2 MB (base local + sync). Se subió el umbral de aviso y dividirlo queda para la Fase 10. | Se carga una vez y queda en caché. |
| X45 | Android: `android.overridePathCheck=true` en `android/gradle.properties`. | La ruta del proyecto tiene tildes ("Julián", "Programación"). Si alguna herramienta fallara, mover el proyecto a una ruta sin tildes. |
| X46 | El APK se compila con un **JDK 21** (el script lo busca solo). El JDK que trae Android Studio es el 25 y Gradle 8.14 (Capacitor 8) no lo soporta. | Verificado al compilar. |
| X47 | Splash nativo se oculta desde el código al montar la app (`launchAutoHide: false`). | Evita un destello blanco. |

## 2026-10-01 — Configuración de Supabase

| # | Decisión | Motivo |
|---|---|---|
| X48 | SMTP propio con **Resend** (plan gratuito), remitente `onboarding@resend.dev` y API key con permiso de **solo envío**. La cuenta de Resend usa el mismo email del usuario de la app. | En proyectos nuevos del plan gratuito, Supabase no deja editar las plantillas sin SMTP propio, y la app necesita la plantilla con `{{ .Token }}`. Sin dominio, Resend solo envía al dueño de la cuenta, lo que alcanza para un único usuario. Al tener dominio propio: verificarlo en Resend y cambiar el remitente. |
| X49 | El código de inicio de sesión tiene **8 dígitos** (el spec y el diseño decían 6). La longitud vive en una sola constante, `OTP_LENGTH` en `src/config/app.ts`, que debe coincidir con *Email OTP Length* de Supabase. El campo acepta códigos pegados con espacios o guiones. | El proyecto de Supabase envía 8 dígitos y el usuario prefirió adaptar la app antes que tocar la configuración del correo. |
| X50 | Los errores al pedir el código distinguen "sin internet" (`offline`) de "el servidor no respondió" (`unavailable`, errores 502–504) y "falló el envío del email" (`emailFailed`, errores 5xx). | Una falla de SMTP se mostraba como falta de conexión y confundía el diagnóstico. |

## 2026-10-01 — Ajustes tras las primeras pruebas del usuario

Reemplazan lo que dicen el spec (TSK-1, TSK-3, S8, 11.4, 11.7) y el diseño (`design/screens/tasks.md`, `design/screens/navigation.md`) sobre crear y ver el detalle de una tarea.

| # | Decisión | Motivo |
|---|---|---|
| X51 | Crear, editar y ver todos los datos de una tarea se hace en una **ventana modal** (bottom sheet alto en mobile, modal centrado de 600px en desktop) que bloquea la app hasta cerrarla. Se eliminan la creación rápida inline (barra arriba de la lista), el panel inferior de creación rápida y la **tercera columna** de detalle (≥ 1024px): la lista ocupa todo el ancho. La ruta `/task/:id` sigue existiendo y abre la ventana de edición (deep link para la Fase 8). | Pedido del usuario: el formulario se mezclaba con las tareas y no se descubría cómo guardar. |
| X52 | La ventana de crear tiene todos los campos (título obligatorio, descripción, fecha, prioridad, color, carpeta) y dos botones: **"Crear"** (guarda y cierra) y **"Crear y agregar otra"** (guarda, vacía título y descripción, conserva fecha/prioridad/color/carpeta). Enter en el título y Ctrl/⌘+Enter en cualquier campo equivalen a "Crear". Reemplaza S8 y X38. | Pedido del usuario: botón de guardar visible sin perder la carga rápida de listas largas. |
| X53 | La edición usa **guardado explícito** ("Guardar"/"Cancelar") en lugar del guardado automático por campo. Al guardar solo se escriben los campos que cambiaron (y, si cambió la carpeta, la tarea se mueve al final de la nueva). Cerrar con cambios sin guardar (X, Cancelar, Esc, clic afuera, atrás de Android) pide confirmar "¿Descartar los cambios?"; en mobile, mientras hay cambios, el panel no se cierra deslizando. | Consistencia con la ventana de crear y evitar perder lo escrito por un toque accidental. |
| X54 | Etiquetas y Adjuntos se muestran **bloqueados** ("Disponible en una próxima versión") en la ventana hasta las Fases 5 y 9; Recordatorios y Anclar siguen como en X40. | Que la ventana muestre desde ya todos los apartados que va a tener. |
| X55 | Cada fila de tarea tiene una **flecha** que despliega sus detalles debajo (descripción completa, fecha larga, prioridad, color y botón "Editar") sin bloquear la app; se pueden tener varias desplegadas. El estado vive solo en memoria durante la sesión (no se guarda). Tocar el título abre la ventana de edición. | Pedido del usuario: ver detalles sin abrir la ventana. |
| X56 | Ajustes, Hoy y Buscar tienen botón **Volver** en el encabezado, que lleva a Carpetas (igual que el botón atrás de Android). | En la barra lateral expandida no había forma visible de volver a la raíz. |
| X57 | Una carpeta sin tareas muestra en la sección "Tareas" el mensaje "Esta carpeta no tiene tareas." con la guía para crear una, aunque tenga subcarpetas. | Antes, con subcarpetas y sin tareas, la sección quedaba vacía sin explicación. |

## 2026-10-02 — Fase 5: etiquetas, Hoy/Próximas, búsqueda y links

| # | Decisión | Motivo |
|---|---|---|
| X58 | Bloque de trabajo: **Fase 5 completa** + pantalla **Ajustes → Etiquetas** (SET-4), adelantada de la Fase 6. | Pedido del usuario de agrupar secciones; sin esa pantalla se podían crear etiquetas pero no renombrarlas ni borrarlas (TAG-1). |
| X59 | En la ventana de tarea, etiquetas y links se guardan con "Crear"/"Guardar" junto con el resto (X53). Excepción: crear una etiqueta nueva desde el selector la guarda en el momento (es global), con **color automático** (el menos usado; se cambia en Ajustes). Si al guardar quedó un link escrito sin tocar "Listo", se incorpora; si su dirección no es válida, no se guarda nada y se avisa. | Consistencia con el guardado explícito y no perder lo escrito. |
| X60 | "Crear y agregar otra" conserva las etiquetas (como fecha, prioridad, color y carpeta) y vacía los links. Reemplaza en parte a X52. | Las etiquetas suelen repetirse en una lista; los links son propios de cada tarea. |
| X61 | `task_tags.id` es **determinístico**: SHA-256 de (task_id, tag_id) con formato UUID (versión 8, `taskTagId` en `src/lib/ids.ts`). | Si dos dispositivos agregan la misma etiqueta a la misma tarea sin conexión generan la misma fila: no hay duplicados ni subidas descartadas por `unique (task_id, tag_id)`. |
| X62 | Al guardar la edición, todo va en **una sola transacción** (`taskRepo.applyEdits`): campos, carpeta, links, etiquetas quitadas y, al final, etiquetas agregadas. | Lo único que el servidor podría rechazar es una etiqueta eliminada en otro dispositivo; al ir último no arrastra al resto de la transacción (X17). |
| X63 | Eliminar una etiqueta pide **confirmación** con la cantidad de tareas que la tienen; se borran sus `task_tags` y se marca `deleted_at` (spec 6.5). Sin "Deshacer". | Afecta a varias tareas a la vez (spec 11.6: confirmación para lo destructivo de mayor impacto). |
| X64 | Filtros de la vista de carpeta ("Solo prioritarias" y "Etiqueta"): abarcan la carpeta y **todas sus subcarpetas** (en la raíz, todas); muestran solo **pendientes** en una lista plana con la ruta de cada tarea, sin reordenar; se conservan al navegar durante la sesión (no se guardan). "Ir a la carpeta" los quita. | S9 extendido a etiquetas para que ambos filtros se comporten igual. Reordenar no tiene sentido en una lista que mezcla carpetas. |
| X65 | Vista Hoy: **"Esta semana" = desde pasado mañana hasta el domingo** (semana de lunes a domingo). Dentro de cada grupo: prioritarias, fecha (la más vencida primero), orden de las carpetas en el árbol y orden manual. Grupos colapsables (abiertos por defecto). | Coherente con X37 ("Próxima semana" = próximo lunes, que cae en "Más adelante"). |
| X66 | Hoy, Buscar y los filtros abren la tarea en la ventana **sobre la misma pantalla** (sin cambiar de ruta). La ventana, el menú y los detalles de esas filas tienen **"Ir a la carpeta"** (si hay cambios sin guardar, pide confirmar). | SRC-2. Volver deja la búsqueda o la vista como estaban. |
| X67 | Búsqueda: cada palabra escrita debe aparecer en el título, la descripción o el nombre de una etiqueta; incluye completadas (al final). Orden: pendientes, coincidencia en el título, prioritarias, alfabético. Filtro por etiqueta (sirve también sin texto). Espera de 150 ms al escribir. El texto y la etiqueta se conservan durante la sesión. | SRC-1 a SRC-4. Buscar "contrato cliente" encuentra "Revisar contrato con el cliente". |
| X68 | Links: solo `http(s)`; un dominio sin protocolo recibe `https://`; se rechazan `javascript:`, `mailto:` y otros. Límites 2048 (URL) y 200 (texto), iguales a los CHECK de la migración. Se abren fuera de la app: web en pestaña nueva con `noopener`; Android con **`@capacitor/browser`** 8.0.x (Custom Tabs). Quitar un link en la ventana lo marca con `deleted_at`. | Spec 6.8 y 10.1. Plugin oficial verificado en la documentación de Capacitor. |
| X69 | Chips de etiqueta: fondo del color al 12%, **punto de color y texto en el color principal** (no en el color de la etiqueta). | El diseño pide texto del color, pero ámbar, verde o naranja sobre fondo claro no llegan a contraste AA (spec 11.6). |
| X70 | Indicadores de la fila: en mobile, ícono de etiqueta o clip con la cantidad; desde 768px, hasta 2 chips de etiqueta y "+N" (diseño `tasks.md`/`folders.md`). | En 360–390px no entran chips completos sin tapar el título. |

**Limitación conocida:** si se crea la misma etiqueta (mismo nombre) sin conexión en dos dispositivos, al sincronizar el servidor rechaza la segunda (índice único por nombre) y las asignaciones de esa copia se pierden. Es poco probable con un solo usuario.

## 2026-10-02 — Ajuste tras la Fase 5 (pedido del usuario)

| # | Decisión | Motivo |
|---|---|---|
| X71 | En mobile, la fila de tarea pasa a **altura mínima** (no fija) y los indicadores (anclada, etiquetas, adjuntos, fecha límite, ruta de carpeta) se muestran en una **segunda línea debajo del título**, en vez de a su derecha en la misma línea. En desktop (`≥ 768px`) siguen a la derecha, sin cambios. | El usuario notó que con fecha, etiquetas y links juntos el título se recortaba demasiado en el celular. |

## 2026-10-02 — Bloque 3: ajustes, respaldo, limpieza programada y atajos

| # | Decisión | Motivo |
|---|---|---|
| X72 | Nuevo plan en dos bloques. **Bloque 3** (ahora): resto de la Fase 6 (retención, respaldo JSON, limpieza programada en el servidor) + resto de la Fase 7 (atajos de teclado, búsqueda como overlay, ayuda de atajos, clic derecho, guía de deploy). **Bloque 4** (después de la confirmación del usuario): Fase 8 completa (notificaciones, avisos, recordatorios, anclado, diagnóstico). | Pedido del usuario de armar bloques con varias fases. El Bloque 3 no necesita el celular; el 4 necesita el Spike B en el dispositivo real. |
| X73 | Los **ajustes de avisos de vencimiento** (SET-3) pasan del Bloque 3 al Bloque 4. | Sin notificaciones no tienen efecto, y el diseño los muestra solo en Android (en web, una fila informativa). |
| X74 | **Retención** como stepper dentro de Ajustes → Tareas (− N días +, 1–90), no en una subpantalla. Cada toque se ve al instante y se guarda tras 400 ms sin tocar (si se sale antes, se guarda igual). Deshabilitado hasta que la configuración se descarga del servidor. | Un toque menos que el diseño; con la espera no se encola un cambio por cada toque. Sin la fila del servidor el cambio se perdería (X20). |
| X75 | **Respaldo JSON:** filas con los nombres de columna del servidor (snake_case) y booleanos `true/false`; sin lo eliminado ni lo que depende de algo eliminado (tareas de carpetas eliminadas, links y etiquetas de tareas eliminadas, etc.); `settings` es la fila de `user_settings` o `null` si todavía no se descargó. Web: descarga por Blob. Android: `@capacitor/filesystem` 8.1 (caché de la app) + `@capacitor/share` 8.0; si se cierra el menú de compartir no se avisa nada. Se muestra "Último respaldo en este dispositivo" (guardado solo en el dispositivo). | Spec 7.8 y 13 (recomendar respaldos periódicos). Mismo formato que la base para poder importarlo en el futuro. La caché es la única carpeta compartible sin tocar `file_paths.xml`. |
| X76 | **Limpieza del servidor:** funciones SQL `cleanup_storage_paths` y `cleanup_purge` (solo `service_role`) + Edge Function `cleanup` que primero borra los archivos de Storage en tandas de 100 y después las filas; si Storage falla, no borra filas y se reintenta al día siguiente. Las dos funciones reciben el mismo instante. Las carpetas eliminadas se purgan solo si su subárbol no tiene nada vivo. También se borran recordatorios de más de 1 día sin fechas. Programada con pg_cron a las 06:30 UTC; la URL y la clave se leen de Vault. | Spec 8.4. Las FK en cascada borrarían tareas vivas movidas a una carpeta eliminada. Ningún secreto en el repositorio. |
| X77 | La Edge Function se protege con una **secret key con nombre** (`cleanup`) validada por `withSupabase({ auth: 'secret:cleanup' })` de `@supabase/server` 1.9 (documentado por Supabase), desplegada con `--no-verify-jwt --use-api` (sin Docker). Las pruebas de las funciones SQL corren la migración inicial real en **PGlite** (Postgres en WASM, dependencia de desarrollo) con stubs mínimos de Supabase. | La clave se puede rotar sin tocar otras. Las claves nuevas no son JWT. PGlite permite probar el SQL sin Docker ni acceso a la base real. |
| X78 | **Atajos de teclado** (solo desde 768px): `N` hace lo mismo que el botón "+" de la pantalla (en una carpeta, nueva tarea; en Carpetas, nueva carpeta; en Hoy, Buscar y Ajustes no hace nada); `/` y `Ctrl/⌘+K` abren la búsqueda flotante (en la pantalla Buscar solo enfocan el campo). Se reconocen por el carácter (`event.key`), así `/` funciona con teclado español. No actúan mientras se escribe (salvo `Ctrl+K`, que no escribe nada) ni con una ventana, menú o globo abierto. `Esc` y `Enter` los siguen manejando las ventanas y los formularios. | Spec 11.7. La pantalla registra su acción "+" en `uiStore` (`newItemAction`), así el atajo no duplica la lógica de cada pantalla. |
| X79 | **Búsqueda flotante** en desktop: ventana centrada de 600px con el mismo contenido que la pantalla Buscar (`SearchPanel` compartido; comparte el texto y la etiqueta). La tarea se abre encima y al cerrarla se vuelve a los resultados; "Ir a la carpeta" cierra todo. "Buscar" de la barra lateral sigue llevando a la pantalla. | Diseño `today-search.md`. Se puede seguir trabajando con los resultados sin perderlos. |
| X80 | **Ayuda de atajos**: ícono "?" en el encabezado de Carpetas y Hoy (solo desktop) que abre un globo con la tabla N / `/` o Ctrl+K / Esc / Enter. **Clic derecho** sobre una fila de tarea o carpeta abre su menú "⋯" (solo desktop); se respeta el menú del navegador sobre links externos, campos de texto y texto seleccionado. | Diseño `components.md` y `navigation.md`; spec 11.7 (clic derecho opcional). |
| X81 | Los avisos (por ejemplo, "Deshacer") se pueden tocar aunque haya una ventana modal abierta, y tocarlos no la cierra. | En la búsqueda flotante se puede eliminar una tarea sin cerrar la ventana; antes el "Deshacer" quedaba bloqueado detrás del fondo oscuro. |
| X82 | Deploy de la web **con la CLI de Netlify** (`npx netlify-cli deploy --build --prod`) mientras no haya git; no usar Netlify Drop (arrastrar `dist`). | Netlify Drop no lee `netlify.toml`: las rutas como `/today` darían 404 al recargar y faltarían las cabeceras de seguridad. |
| X83 | **Reemplaza a X82.** Las redirecciones de la SPA y las cabeceras HTTP pasan de `netlify.toml` a `public/_redirects` y `public/_headers`, que Vite copia a `dist/`. `netlify.toml` queda solo con la configuración de build. Ahora se puede publicar **arrastrando `dist`** (Netlify Drop), con la CLI o con un repositorio conectado, y siempre se aplican las mismas reglas. Validado con los parsers oficiales de Netlify; un test (`tooling/netlifyConfig.test.ts`) evita que vuelvan a `netlify.toml`. | Pedido del usuario. `netlify.toml` está en la raíz del proyecto, fuera de `dist`: al arrastrar solo `dist` no viajaba, y la SPA daba 404 al recargar una ruta y no tenía las cabeceras de seguridad. Los archivos `_redirects`/`_headers` de la carpeta publicada se aplican en todos los casos. |

## 2026-10-02 — Cierre de sesión: prioridad web/PWA

| # | Decisión | Motivo |
|---|---|---|
| X84 | **Prioridad web/PWA.** Las notificaciones de Android (resto de la Fase 8: 8A–8F) se **posponen** hasta que el usuario quiera probar el celular. El proyecto Android se mantiene compilando (`npm run android:build`) pero no se prueba. Nuevos bloques: **4** = tests E2E en el repo + Ajustes → Alertas en web; **5** = archivos adjuntos (Fase 9, web); **6** = pulido web (Fase 10). Reemplaza el Bloque 4 de X72. | Pedido del usuario: avanzar de a poco y probar solo la web por ahora. |
| X85 | Las **alertas de vencimiento** (SET-3) se pueden configurar **también desde la web** (activar, días 0/1/2/3/7 y hora), con la nota "Los avisos llegan en la app de Android". Reemplaza a X73 y se aparta del diseño (`settings.md` pedía solo una fila informativa en web). | Elegido por el usuario: la configuración se sincroniza y es más cómodo cambiarla desde la PC. |
| X86 | Confirmado por el usuario: la **retención** sigue como en X74 (las completadas que quedan fuera al bajarla se borran en la próxima apertura o en la limpieza diaria, sin borrado inmediato); el **atajo N** y **"Buscar"** de la barra lateral siguen como en X78–X79; **sin acceso de Claude a la base** de Supabase por ahora. | Respuestas del usuario al cierre del Bloque 3. |
| X87 | **Git:** repositorio local (rama `main`, sin remoto) desde el 2026-10-02. Autor configurado **solo en este repositorio**. Un commit al cerrar cada bloque (lint, typecheck, tests y build en verde y documentación al día); **nunca push** sin pedido del usuario. `.gitattributes` fuerza LF (CRLF solo para `.bat`/`.cmd`). Reemplaza a X2. | Pedido del usuario. Git for Windows trae `core.autocrlf=true` y al hacer checkout convertiría los archivos a CRLF (Prettier y el proyecto usan LF). |

## 2026-10-02 — Repositorio público en GitHub

| # | Decisión | Motivo |
|---|---|---|
| X88 | **Reemplaza en parte a X87.** El repositorio ahora tiene remoto: `origin` = `https://github.com/JulianSN62/ToDo-List-App.git` (público), `main` sigue a `origin/main`. Se hizo una auditoría completa de los 292 archivos ya commiteados (claves `sb_secret_`, JWT, contraseñas, claves privadas, URLs reales de Supabase/PowerSync) antes del push: no apareció nada sensible, solo valores de ejemplo en `docs/SETUP.md` y `.env.example` vacío. El `.gitignore` ya cubría `.env`, keystores, builds de Android y credenciales de Supabase/Netlify, así que no hizo falta tocarlo. El push funcionó sin configuración extra, con el Credential Manager que trae Git para Windows (`credential.helper=manager` del sistema). | Pedido del usuario: ya creó el repositorio y pidió subir todo y dejarlo listo para las próximas sesiones. |
| X89 | De ahora en más, **push solo cuando el usuario lo pida explícitamente** (no automático después de cada commit local), y siempre con un reescaneo rápido de secretos antes, por ser un repositorio público. | El repositorio es público: conviene una revisión extra antes de cada subida, no solo antes del primer commit. |

## 2026-10-02 — Bloque 4: tests E2E y alertas de vencimiento en web

| # | Decisión | Motivo |
|---|---|---|
| X90 | Esta sesión hace **solo el Bloque 4** (tests E2E en el repo + Ajustes → Alertas de vencimiento en web), en fases 4A–4E. Los Bloques 5 (archivos) y 6 (pulido) siguen como en X84. | Elegido por el usuario al planificar la sesión. |
| X91 | Las **alertas de vencimiento** van en una **subpantalla** `/settings/alerts`, como en el diseño y como Etiquetas. En Ajustes → Tareas hay una fila con el resumen debajo del título ("1 día antes y el mismo día · 09:00" o "Desactivadas"). | Elegido por el usuario. Ajustes queda corto, y con el resumen debajo del título no se recorta en 360px. |
| X92 | **Alertas:**<br>• Con las alertas activadas **siempre queda al menos un día marcado**. El último no se puede desmarcar, y una ayuda explica que para no recibir avisos se usa el interruptor.<br>• Los días se guardan de mayor a menor (por ejemplo `[7,1,0]`).<br>• El interruptor y los días se guardan al instante. La hora se guarda tras 400 ms sin cambios, o al salir de la pantalla, y solo si está completa.<br>• Antes de la primera sincronización todo queda deshabilitado, como la retención (X74). | Elegido por el usuario. Evita una configuración "activada pero sin avisos". |
| X93 | **`npm run e2e` forma parte del cierre de cada bloque**, junto con lint, typecheck, tests y build. | Elegido por el usuario: detecta roturas en las pantallas antes del commit (unos 2–3 minutos). |
| X94 | **Tests E2E en el repo:**<br>• Corren con `@playwright/test` y el **Edge instalado** (`channel: 'msedge'`), sin descargar navegadores.<br>• Proyectos: `mobile` (390×844, táctil) y `desktop` (1280×800).<br>• Usan un build propio en `dist-e2e/` (`vite build --mode e2e`), servido con `vite preview` en el puerto 4174.<br>• En el modo `e2e` Vite **no lee ningún `.env`** (`envDir: false`). Las variables públicas son ficticias (dominios `.invalid`) y llegan desde `playwright.config.ts`.<br>• Sesión ficticia y red externa bloqueada, por ruta y por resolución DNS.<br>• Cualquier error de consola inesperado hace fallar el test.<br>• Los selectores usan los textos de `src/i18n/es.ts`. | Las pruebas de las sesiones anteriores vivían en carpetas temporales. Así se pueden repetir en cualquier clon del repositorio, que es público, sin credenciales y sin tocar el proyecto real. |
| X95 | En mobile, los **avisos** (toasts) se muestran **por encima del botón "+"**. Antes iban a la misma altura y lo tapaban mientras duraba el aviso: unos 4 s, o 6 s con "Deshacer". Se aparta un poco del diseño (`components.md` dice "sobre el bottom nav"). | Lo detectó la nueva prueba E2E: después de crear una tarea no se podía tocar "+" hasta que se fuera el aviso. |
| X96 | Esta sesión hace **solo el Bloque 5** (archivos adjuntos en web, Fase 9), en fases 5A–5E: servidor, datos y plataforma, interfaz, pruebas y cierre. La cámara (Android) queda para cuando se pruebe el celular (X84). | Elegido por el usuario al planificar la sesión. |
| X97 | **Archivos adjuntos — decisiones del usuario:**<br>• Se adjuntan **al guardar** la ventana, igual que los links. "Cancelar" los descarta y también sirve en "Nueva tarea".<br>• **Sin conexión** se ven los archivos ya abiertos en ese dispositivo. Cada uno se descarga la primera vez que se abre y queda guardado. Las **fotos** de una tarea se bajan solas al mostrarla, para la miniatura.<br>• **Abrir según el tipo:** fotos en un visor dentro de la app (con "Descargar"), PDF en una pestaña nueva y el resto se descarga.<br>• **Ajustes → Datos** muestra el espacio en la nube (frente al 1 GB del plan gratuito) y en el dispositivo. "Liberar espacio" borra del dispositivo solo lo que ya está en la nube. | Elegido por el usuario (todas las opciones recomendadas). |
| X98 | **Cola de subida propia** (`src/data/fileSync.ts` + `src/lib/uploadQueue.ts`) en vez del `AttachmentQueue` de PowerSync. El de PowerSync viene en `@powersync/common` 2.3.1 pero:<br>• Está marcado como *alpha/experimental*.<br>• Por defecto usa una tabla local `attachments`, que choca con la nuestra.<br>• No tiene un estado "error" con "Reintentar": o reintenta o archiva.<br>• Baja todos los archivos automáticamente. | Responde el [VERIFICAR] de la spec 10.2. La cola propia es chica, se prueba con tests y sigue la spec 5.5 (`attachment_local_state`). |
| X99 | **Cola de subida:**<br>• Sube de a un archivo, bajo un candado del navegador (`navigator.locks`) para que dos pestañas no suban lo mismo.<br>• Usa `upsert: true`, así reintentar no falla aunque la subida anterior haya terminado.<br>• **Errores pasajeros** (sin red, 5xx, 429, 401): se reintenta solo a los 5 s, 15 s, 30 s, 1 min y después cada 2 min. Sin conexión no cuenta como intento: espera al evento `online`.<br>• **Errores permanentes** (400, 403, 404, 413, 415): el archivo queda "No se pudo subir" con **Reintentar**.<br>• Se saltean los adjuntos y las tareas borrados.<br>• Los archivos pendientes cuentan como cambios sin subir: indicador de sincronización y aviso al cerrar sesión. | Spec 10.2: cola con reintentos y estado por adjunto. |
| X100 | **Archivos en el dispositivo:**<br>• Se guardan en **IndexedDB** (`todo-files`), detrás de `LocalFileStore` en `src/platform`. Android usa por ahora la misma implementación, porque el WebView la soporta; se puede pasar a `@capacitor/filesystem` sin tocar la app.<br>• El estado de cada archivo va en la tabla **solo local** `attachment_local_state` (spec 5.5, X21).<br>• Al **cerrar sesión** se borran los dos.<br>• Al abrir la app se borran los archivos de adjuntos que ya no existen o se eliminaron. A los huérfanos se les da una hora de margen, para no borrar uno que se está adjuntando.<br>• Al adjuntar el primer archivo se pide almacenamiento persistente (`navigator.storage.persist()`). | Que los archivos sin subir no se pierdan y que no queden datos de una sesión cerrada. |
| X101 | **Fotos:**<br>• JPEG se comprime a JPEG y PNG/WebP a **WebP** (conserva la transparencia), con lado mayor 1600 px y calidad 0,8 (spec 10.2). La versión comprimida solo se usa si queda más liviana. GIF, SVG y HEIC se adjuntan sin tocar.<br>• Al re-codificar se pierden los metadatos, como la ubicación de la foto.<br>• El **límite de 10 MB** se controla **después de comprimir**: una foto de 12 MB que queda en 1 MB se acepta. | Fotos de celular más livianas, sin rechazar las que quedarían dentro del límite. |
| X102 | **Seguridad al abrir archivos:**<br>• Un `blob:` hereda el origen de la app, así que nunca se abre en una pestaña nada que no sea PDF: un HTML adjunto podría leer la sesión.<br>• Las fotos se muestran solo con `<img>`. El resto se descarga como `application/octet-stream`.<br>• Se probó en Edge que el PDF se ve en la pestaña nueva con la CSP actual. Si el navegador bloquea la ventana, se descarga. | Mitiga XSS por archivos adjuntos (la sesión web vive en `localStorage`). |
| X103 | **Migración `20261003120000_attachment_files.sql`:**<br>• **CHECKs:** `file_name` 1–255, `mime_type` ≤ 255, y un archivo exige nombre y tamaño. La **ruta** debe ser exactamente `{owner_id}/{task_id}/{id}-{nombre}`, así una fila no puede apuntar al archivo de otro usuario ni de otro adjunto (la limpieza corre con `service_role`).<br>• **Papelera de Storage** (`private.storage_trash`): un trigger anota la ruta cuando una fila de archivo se **borra de verdad**. Pasa al limpiarse una completada vencida desde la app, en cascada o al darse de baja la cuenta. La limpieza diaria la vacía con 5 min de margen.<br>• `cleanup_storage_paths` y `cleanup_purge` se actualizan; la Edge Function no cambia.<br>• No hay tablas sincronizadas nuevas: `sync-config.yaml` y la publicación no cambian. | Antes, borrar una tarea en la app borraba en cascada la fila del adjunto y el archivo quedaba huérfano en Storage. La limpieza local ahora borra también los archivos de las tareas vencidas. |
| X104 | **Descargas:** URL firmada de 60 s (`createSignedUrl`) + `fetch`. Si el archivo todavía no está en Storage (404), se avisa "todavía se está subiendo desde otro dispositivo". Sin conexión, "este archivo todavía no está guardado en este dispositivo". | Spec 10.2 (URL firmada de corta duración). Un archivo puede aparecer en otro dispositivo antes de terminar de subirse. |
| X105 | La migración `20261003120000_attachment_files.sql` **verifica al empezar** que exista `private.cleanup_plan`, de `20261002120000_cleanup_functions.sql`. Si falta, se cancela sin cambios con un mensaje que dice qué correr antes. `SETUP.md` 12.2 deja claro el orden: la 3 necesita la 1; la 2 puede esperar. La migración se pudo editar porque nunca llegó a aplicarse. | Al correrla, el usuario recibió `schema "private" does not exist`, porque todavía no había corrido la de limpieza. La guía decía "si ya habías corrido las dos primeras" sin aclarar que la 1 era obligatoria. |
