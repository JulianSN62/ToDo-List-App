# Puesta en marcha — ToDo List

Guía paso a paso para crear la base de datos, conectar la sincronización, correr la app en la PC, instalarla como PWA, compilar el APK de Android (de prueba y firmado) y publicar la web en Netlify. Al final: cómo [armar todo de nuevo desde cero](#14-restaurar-desde-cero-servidor-nuevo) y cómo [publicar una versión nueva](#15-publicar-una-versión-nueva).

> **Regla de oro:** ninguna contraseña ni clave secreta se escribe en archivos del proyecto. En `.env` van **solo valores públicos** (URL del proyecto, publishable key y URL de PowerSync). El build se cancela solo si detecta un secreto ahí.

---

## 0. Requisitos

| Herramienta | Versión | Para qué |
|---|---|---|
| Node.js | 22.22 o superior (probado con 24.15) | Desarrollo y build |
| Cuenta de Supabase | Plan gratuito alcanza | Base de datos, login y archivos |
| Cuenta de PowerSync | Plan gratuito alcanza | Sincronización offline |
| Android Studio + **JDK 21** | Android SDK 36 | Compilar el APK |
| Cuenta de Netlify | — | Publicar la web |
| Microsoft Edge | El que trae Windows | Tests E2E (`npm run e2e`) |

---

## 1. Supabase: crear el proyecto

1. En https://supabase.com/dashboard → **New project**.
2. Región: la más cercana (por ejemplo, São Paulo).
3. Guardá la contraseña de la base en un gestor de contraseñas. **No** la pongas en el `.env` ni en ningún archivo: la app no la necesita.

## 2. Supabase: correr la migración

1. Abrí **SQL Editor → New query**.
2. Copiá **todo** el contenido de `supabase/migrations/20261001000000_initial_schema.sql`, pegalo y tocá **Run**.
3. Tiene que terminar sin errores ("Success. No rows returned"). Se ejecuta en una transacción: si algo falla, no queda nada a medias y se puede volver a correr.

La migración crea: tablas, triggers, políticas RLS (cada usuario ve solo lo suyo), el bucket privado `attachments`, el rol de replicación `powersync_role` (sin contraseña) y la publicación `powersync`.

## 3. Supabase: contraseña del rol de PowerSync

1. Generá una contraseña larga y aleatoria con tu gestor de contraseñas (30+ caracteres, sin comillas simples).
2. En **SQL Editor → New query**, ejecutá (reemplazando el texto):

   ```sql
   alter role powersync_role with password 'PEGAR_ACA_LA_CONTRASEÑA_GENERADA';
   ```

3. Después **borrá esa consulta** del SQL Editor (el editor guarda las consultas). Esta contraseña solo se va a pegar en el panel de PowerSync (paso 6).

## 4. Supabase: autenticación (login con código por email)

1. **Crear tu usuario:** *Authentication → Users → Add user → Create new user*. Poné tu email, una contraseña cualquiera (no se usa) y marcá **Auto Confirm User**.
2. **Desactivar registros públicos:** *Authentication → Sign In / Providers* → desactivá **Allow new users to sign up**. (La app además pide el código con `shouldCreateUser: false`, así que nunca crea usuarios.)
3. **Código numérico y vencimiento corto:** *Authentication → Sign In / Providers → Email*:
   - **Email OTP Expiration:** `600` segundos (10 minutos).
   - **Email OTP Length:** `8`. Tiene que coincidir con `OTP_LENGTH` en `src/config/app.ts`; si se cambia uno, cambiar el otro.
4. **Servidor de correo propio (obligatorio para editar la plantilla):** desde 2026, en proyectos nuevos del plan gratuito Supabase no deja editar las plantillas de email si no se configura un SMTP propio. Se usa **Resend** (gratuito):
   1. Crear una cuenta en https://resend.com **con el mismo email** del usuario creado en el paso 1. Sin dominio propio, Resend solo envía al email del dueño de la cuenta, y eso alcanza porque sos el único usuario.
   2. En Resend: *API Keys → Create API Key* con permiso **Sending access** (solo envío). La clave (`re_...`) se muestra una sola vez: pegarla directamente en Supabase y no guardarla en ningún archivo.
   3. En Supabase: *Authentication → Emails → SMTP Settings* (o *Project Settings → Authentication → SMTP Settings*) → activar **Enable Custom SMTP**:
      - Sender email: `onboarding@resend.dev`
      - Sender name: `ToDo List`
      - Host: `smtp.resend.com`
      - Port: `465`
      - Username: `resend`
      - Password: la API key de Resend
      - Minimum interval: `60` segundos
   4. Cuando haya dominio propio, se verifica el dominio en Resend y se cambia el remitente (por ejemplo `no-reply@tudominio.com`).
5. **Plantilla del email con el código:** *Authentication → Emails → Templates → Magic Link* (los códigos usan esta plantilla). Reemplazá el contenido por algo así:

   - Asunto: `Tu código de acceso`
   - Cuerpo:

     ```html
     <h2>Tu código de acceso</h2>
     <p>Ingresá este código en la app:</p>
     <p style="font-size: 28px; font-weight: bold; letter-spacing: 6px">{{ .Token }}</p>
     <p>Vence en 10 minutos. Si no lo pediste, ignorá este correo.</p>
     ```

   Importante: que la plantilla **no** incluya `{{ .ConfirmationURL }}` (la app usa solo el código, nunca el link).
6. **Límites de envío:** *Authentication → Rate Limits*. Supabase ya limita a un código por minuto por usuario; revisá el límite de emails por hora y el de verificaciones.
7. **Captcha (opcional, hoy apagado):** si más adelante lo querés, creá un sitio en Cloudflare Turnstile, activá el captcha en *Authentication → Attack Protection* con la **secret key** y poné la **site key** en `VITE_CAPTCHA_SITE_KEY` del `.env`.

## 5. Supabase: datos para el `.env`

En *Project Settings → API Keys* (o el botón **Connect** del proyecto):

- **Project URL** → `VITE_SUPABASE_URL` (ej.: `https://abcd1234.supabase.co`)
- **Publishable key** (empieza con `sb_publishable_`) → `VITE_SUPABASE_PUBLISHABLE_KEY`

**Nunca** uses la *secret key* (`sb_secret_...`) ni la `service_role` en el `.env`.

Verificá también que la **Data API** esté habilitada y exponga el esquema `public` (*Project Settings → Data API*): la app sube los cambios por ahí.

## 6. PowerSync: crear la instancia y conectarla

1. Entrá a https://dashboard.powersync.com y creá un proyecto (se crea una instancia de desarrollo).
2. **Database Connection → Postgres:**
   - En Supabase tocá **Connect** y copiá el string de **Direct connection**.
   - Pegalo en el campo **URI** de PowerSync (completa host, puerto y base solos).
   - Cambiá **Username** por `powersync_role` y **Password** por la contraseña del paso 3.
   - SSL: `verify-full` (PowerSync ya incluye el certificado de Supabase).
   - **Test connection** → **Save**.
3. **Client Auth:** activá **Use Supabase Auth**. Con las claves de firma nuevas de Supabase dejá vacío el campo "JWT Secret (Legacy)": PowerSync configura solo el endpoint JWKS. **Save and Deploy**.
4. **Sync Streams:** pegá el contenido de `powersync/sync-config.yaml` → **Validate** → **Deploy**.
5. Copiá la **URL de la instancia** (ej.: `https://xxxx.powersync.journeyapps.com`) → `VITE_POWERSYNC_URL`.

## 7. Completar el `.env` y correr la app

```bash
npm install
# Completar .env (ver .env.example)
npm run dev
```

Abrí http://localhost:5173 → ingresá tu email → te llega el código → la app abre en "Carpetas".

Para comprobar la sincronización: abrí la app en dos navegadores distintos con la misma cuenta, creá una carpeta en uno y mirá que aparezca en el otro. Para probar sin conexión: DevTools → Network → **Offline**, creá y editá tareas, volvé a **Online** y verificá que se sincronicen.

### Comprobar la seguridad (RLS)

En el SQL Editor:

```sql
-- Todas las tablas tienen que tener rls_enabled = true
select relname as tabla, relrowsecurity as rls_enabled
from pg_class
where relnamespace = 'public'::regnamespace and relkind = 'r';

-- Políticas creadas (una por tabla)
select tablename, policyname from pg_policies where schemaname = 'public';
```

## 8. PWA (versión de escritorio)

```bash
npm run build
npm run preview
```

Abrí http://localhost:4173 en Chrome o Edge → ícono de instalar en la barra de direcciones. La app instalada abre sin conexión y sincroniza al volver internet. Cuando publiques una versión nueva, la app muestra "Hay una nueva versión disponible" con el botón **Actualizar**.

## 9. Android

### Compilar el APK de prueba

```bash
npm run android:build
```

Hace el build web, copia los archivos al proyecto Android (`cap sync`) y compila con Gradle. El APK queda en `android/app/build/outputs/apk/debug/app-debug.apk`.

- Gradle 8.14 (Capacitor 8) necesita un **JDK 21**. El script lo busca solo en las carpetas habituales. El JDK que trae Android Studio es el 25 y **no** sirve. Si tenés el JDK 21 en otra carpeta: variable de entorno `ANDROID_JAVA_HOME`.
- La ruta del proyecto tiene tildes; está permitido en `android/gradle.properties`. Si alguna vez falla una herramienta por eso, mové el proyecto a una ruta sin tildes (por ejemplo `C:\dev\todo-list-app`).

### Instalar en el celular

- **Por cable:** en el celular activá *Opciones de desarrollador → Depuración USB*, conectalo y ejecutá:
  `"%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe" install -r android\app\build\outputs\apk\debug\app-debug.apk`
- **Sin cable:** copiá el APK al celular y abrilo (hay que permitir "instalar apps desconocidas").
- **Desde Android Studio:** `npm run android:open` → botón Run.

Para ver la consola de la app en el celular: Chrome en la PC → `chrome://inspect/#devices`.

Importante: el `.env` se "congela" dentro del APK al compilar. Si cambiás algún valor, volvé a correr `npm run android:build`.

### Notificaciones en el celular

La primera vez que actives las alertas, agregues un recordatorio o anclés una tarea, la app pide permiso (en Android 13 o más aparece el pedido del sistema). En **Ajustes → Notificaciones** (solo en Android) ves si falta algo, con un botón para cada ajuste del sistema:

- **Permiso de notificaciones.**
- **Alarmas exactas:** sin ellas los avisos pueden llegar varios minutos tarde. En Android 12 vienen permitidas; en Android 14 hay que darlas a mano.
- **Optimización de batería:** algunos fabricantes (Samsung, Xiaomi, Motorola…) cortan las apps en segundo plano. Conviene poner ToDo List en "No optimizar" o "Sin restricciones".
- **"Enviar notificación de prueba"** para comprobar que llegan.

Si forzás la detención de la app desde los ajustes de Android, se borran sus alarmas: se reprograman solas la próxima vez que la abras.

### Probar en un emulador (sin el celular)

Se usa el emulador que trae el SDK de Android (WHPX tiene que estar activo en Windows; `emulator -accel-check` lo confirma).

1. **Herramientas de línea de comandos:** bajá `commandlinetools-win-*_latest.zip` desde la página de Android Studio y descomprimilo en `%LOCALAPPDATA%\Android\Sdk\cmdline-tools\latest`.
2. **Imagen del sistema:** `sdkmanager` ahora redirige a la herramienta `android`. Desde PowerShell, con un JDK 21 en `JAVA_HOME`:

   ```powershell
   & "$env:LOCALAPPDATA\Android\Sdk\cmdline-tools\latest\bin\android.exe" "--sdk=$env:LOCALAPPDATA\Android\Sdk" sdk install "system-images;android-34;google_apis;x86_64"
   ```

   La de **Android 14** (`android-34`) trae un WebView 113, que alcanza. La de Android 12 (`android-31`) trae el WebView 91 y no se puede actualizar sin Play Store: la app muestra "Hay que actualizar el navegador" (X125).
3. **Dispositivo virtual:** `avdmanager.bat create avd -n todo_android14 -k "system-images;android-34;google_apis;x86_64" -d pixel_5`. En `%USERPROFILE%\.android\avd\todo_android14.avd\config.ini` conviene poner `hw.keyboard=yes` (teclado de la PC) y borrar la línea `disk.dataPartition.path=<temp>` (si no, los datos se pierden al apagarlo).
4. **Arrancar e instalar:** `emulator -avd todo_android14`, después `adb install -r android\app\build\outputs\apk\debug\app-debug.apk`. Iniciás sesión con tu email y el código, como en el celular.
5. **Reiniciar para probar:** `adb shell svc power reboot`. `adb reboot` corta en seco y Android no guarda el permiso de alarmas exactas.

Los avisos programados se ven con `adb shell dumpsys alarm` y los visibles con `adb shell dumpsys notification --noredact`.

### APK firmado (para instalar y actualizar)

El APK de prueba alcanza para probar, pero se firma con una clave de depuración distinta en cada PC. Para instalar la app de verdad y poder actualizarla siempre, se usa el APK de **release**, firmado con **tu** keystore. El keystore y sus contraseñas **nunca** se suben al repositorio (`*.jks`, `*.keystore` y `keystore.properties` ya están en el `.gitignore`).

1. **Crear el keystore (una sola vez).** Con el `keytool` del JDK 21 (está en `<carpeta del JDK 21>\bin`), desde PowerShell:

   ```powershell
   New-Item -ItemType Directory -Force "$HOME\keystores"
   & "<carpeta del JDK 21>\bin\keytool.exe" -genkeypair -v -keystore "$HOME\keystores\todo-list.jks" -alias todo-list -keyalg RSA -keysize 4096 -validity 10000
   ```

   Pide una contraseña y unos datos (nombre, ciudad; pueden ser genéricos). Guardá la contraseña en tu gestor de contraseñas.
   - Guardá el keystore **fuera del proyecto** (como arriba) y hacé una **copia de seguridad** en otro lugar (un pendrive o una nube cifrada).
   - Si lo perdés, no se puede actualizar la app: habría que desinstalarla (se pierde lo que no se haya sincronizado) e instalar una firmada con otra clave.
2. **Crear `android/keystore.properties`** (ignorado por git) con la ruta y los datos del keystore:

   ```properties
   storeFile=C:/Users/<tu usuario>/keystores/todo-list.jks
   storePassword=<contraseña del keystore>
   keyAlias=todo-list
   keyPassword=<contraseña de la clave; con keytool suele ser la misma>
   ```

   Si preferís no dejar las contraseñas en disco, sacá esas dos líneas y definí `ANDROID_STORE_PASSWORD` y `ANDROID_KEY_PASSWORD` en la terminal antes de compilar. Para usar otro archivo: `ANDROID_KEYSTORE_PROPERTIES` con su ruta.
3. **Compilar:** `npm run android:release`. Sin `keystore.properties` se corta con un aviso (un APK sin firmar no se puede instalar). El APK queda en `android/app/build/outputs/apk/release/app-release.apk`.
4. **Verificar la firma** (opcional): `"%LOCALAPPDATA%\Android\Sdk\build-tools\<versión>\apksigner.bat" verify --print-certs android\app\build\outputs\apk\release\app-release.apk` muestra el certificado de tu keystore.
5. **Instalar:** igual que el de prueba, con `app-release.apk`. Si en el celular está instalado el **de prueba**, Android no deja actualizarlo con otra firma: desinstalalo antes (se borran los datos locales; lo sincronizado vuelve al iniciar sesión).

**Versión:** el APK toma la versión de `package.json` (la que se ve en Ajustes). `versionName` es la misma y `versionCode` se calcula como mayor × 10000 + menor × 100 + parche (0.9.0 → 900). Cada versión nueva tiene que subirla (ver [paso 15](#15-publicar-una-versión-nueva)) para que Android la instale encima.

El identificador `com.todolistapp.app` es definitivo: si cambiara, Android la tomaría como otra app.

## 10. Netlify (publicar la web)

La web es la carpeta `dist` que genera `npm run build`. Las redirecciones de la SPA y las cabeceras de seguridad viajan **dentro de `dist`** (`dist/_redirects` y `dist/_headers`, que salen de `public/`), así que funcionan con cualquiera de las tres formas de publicar. Las variables `VITE_*` se toman de tu `.env` al compilar y quedan dentro del build, igual que en el APK.

### Opción A — Arrastrar `dist` (la más simple)

1. `npm run build` en la PC (usa tu `.env`).
2. La primera vez: entrá a <https://app.netlify.com/drop> **con tu sesión iniciada** y arrastrá la carpeta `dist`. Se crea el sitio (`https://<nombre>.netlify.app`; el nombre se cambia en *Site configuration → Change site name*). Sin sesión iniciada el sitio es temporal.
3. Versiones siguientes: `npm run build` y, en el sitio, pestaña *Deploys* → arrastrá la carpeta `dist` al recuadro para subir una versión manual.

Arrastrá **solo `dist`**, nunca la carpeta del proyecto: subirías el código, `node_modules` y el `.env`.

### Opción B — CLI de Netlify (sin descargar nada: `npx` la trae)

1. `npx netlify-cli login` (abre el navegador).
2. La primera vez: `npx netlify-cli sites:create` (o `npx netlify-cli link` si el sitio ya existe). Queda vinculado en `.netlify/` (ya está en el `.gitignore`).
3. Publicar: `npx netlify-cli deploy --build --prod`.

### Opción C — Repositorio conectado (cuando el proyecto use git)

*Add new site → Import an existing project*. Netlify compila con `netlify.toml` (`npm run build`, carpeta `dist`) y las variables `VITE_*` hay que cargarlas en *Site configuration → Environment variables*.

### Comprobar (cualquier opción)

1. Abrí `https://<nombre>.netlify.app`, entrá a **Hoy** y **recargá la página**: no tiene que dar 404 (eso confirma `_redirects`).
2. DevTools → *Network* → el pedido del documento → *Response Headers*: tienen que aparecer `x-frame-options: DENY` y `strict-transport-security` (eso confirma `_headers`).
3. En la consola no tiene que haber errores de CSP.

El dominio personalizado se agrega después en *Domain management*, sin cambiar nada del código.

## 11. Íconos

Los íconos salen de `assets/icon.svg`, `assets/icon-maskable.svg` y `assets/icon-foreground.svg`. Si cambiás el ícono:

```bash
npm run icons
```

Genera los de la PWA (`public/`) y los de Android (`android/app/src/main/res/`).

## 12. Limpieza programada (Supabase)

Una vez por día el servidor borra lo vencido (spec 8.4): tareas completadas que superaron la retención, lo eliminado hace más de 30 días (con sus archivos en Storage) y recordatorios viejos. Lo hace una **Edge Function** (`supabase/functions/cleanup`) llamada por una tarea programada de Postgres (**pg_cron**). La app también limpia las completadas vencidas al abrirse, así que esto es la red de seguridad del servidor.

Nada de esto guarda secretos en el proyecto: la URL y la clave se cargan en **Supabase Vault**.

### 12.1 Crear la secret key "cleanup"

1. **Project Settings → API Keys → Secret keys → New secret key**.
2. Nombre: `cleanup` (exactamente así: la función solo acepta la clave con ese nombre).
3. Copiá el valor (`sb_secret_...`). No lo pegues en ningún archivo del proyecto.

### 12.2 Correr las migraciones

En **SQL Editor → New query**, de a una y en este orden (pegar todo el archivo → **Run**):

1. `supabase/migrations/20261002120000_cleanup_functions.sql` — funciones de limpieza (solo las puede ejecutar la secret key).
2. `supabase/migrations/20261002120100_cleanup_schedule.sql` — activa `pg_cron` y `pg_net` y programa la tarea `cleanup-daily` (06:30 UTC = 03:30 en Argentina).
3. `supabase/migrations/20261003120000_attachment_files.sql` — archivos adjuntos (Bloque 5): restricciones de las filas de archivos y una **papelera de Storage**. Cuando un adjunto se borra de verdad (por ejemplo, al limpiarse una tarea completada), su ruta queda anotada y la limpieza diaria borra el archivo. Actualiza las dos funciones del punto 1; la Edge Function no cambia.

**La 3 necesita la 1:** usa el esquema `private` y las funciones de limpieza que crea la 1. Si corrés la 3 sin la 1, se cancela sin cambiar nada y avisa qué falta. Corré la 3 **antes de adjuntar archivos con tu cuenta**: sin ella el servidor no tiene las restricciones nuevas y los archivos de tareas borradas quedarían en Storage.

La 2 programa la tarea diaria. Se puede correr ahora o junto con el resto de este paso: mientras no estén la Edge Function y los secretos de Vault, corre pero no hace nada.

### 12.3 Desplegar la Edge Function

Desde la carpeta del proyecto (no necesita Docker):

```bash
npx supabase login
npx supabase functions deploy cleanup --project-ref <ref> --no-verify-jwt --use-api
```

`<ref>` es el identificador del proyecto (el subdominio de la URL: `https://<ref>.supabase.co`). `--no-verify-jwt` es necesario porque la secret key no es un JWT; la función valida la clave por su cuenta.

El repositorio no tiene `supabase/config.toml` (no hace falta para nada más). Si la CLI dice que no encuentra el proyecto o la función, corré una vez `npx supabase init` en la carpeta del proyecto (crea ese archivo, sin secretos) y repetí el `deploy`.

### 12.4 Cargar los secretos en Vault

En **Integrations → Vault → Secrets → Add new secret** (o el menú equivalente del panel), crear dos secretos con estos nombres exactos:

| Nombre | Valor |
|---|---|
| `project_url` | `https://<ref>.supabase.co` |
| `cleanup_secret_key` | la secret key `cleanup` del paso 12.1 |

Mientras falten, la tarea programada corre pero no hace nada.

### 12.5 Probarla una vez a mano

En el SQL Editor:

```sql
-- Llama a la función ahora, igual que la tarea diaria (devuelve un id de pedido)
select net.http_post(
  url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/cleanup',
  headers := jsonb_build_object('Content-Type', 'application/json',
    'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'cleanup_secret_key')),
  body := '{}'::jsonb, timeout_milliseconds := 60000);

-- Unos segundos después: la respuesta tiene que ser 200 con {"ok":true, ...cantidades}
select status_code, content from net._http_response order by created desc limit 1;
```

También se ve en **Edge Functions → cleanup → Logs** (solo cantidades, nunca datos de tareas).

Historial de las ejecuciones diarias: `select * from cron.job_run_details order by start_time desc limit 10;`

## 13. Tests

```bash
npm test        # unitarios, de componentes y de las funciones SQL (PGlite)
npm run e2e     # de punta a punta en el navegador (Playwright + Microsoft Edge)
```

- `npm test` no necesita nada externo.
- `npm run e2e`:
  - Compila un build aparte en `dist-e2e/` con URLs ficticias: **no usa tu `.env`** ni se conecta a Supabase o PowerSync.
  - Lo sirve en http://localhost:4174 y prueba la app en tamaño celular (390px) y escritorio (1280px), con una sesión ficticia y sin red.
  - Usa el Microsoft Edge instalado, así que no descarga navegadores.
  - Si un test falla: `npx playwright show-report`.
- Incluye una revisión automática de accesibilidad con **axe** (contraste AA, nombres y roles) en tema claro y oscuro, y una prueba con 1000 tareas y 300 carpetas que anota los tiempos en la salida.
- Detalle de qué cubre cada prueba: `docs/progress/e2e-tests.md`.

## 14. Restaurar desde cero (servidor nuevo)

Para armar todo de nuevo si se pierde el proyecto de Supabase o de PowerSync, o para crear una copia aparte.

> **Antes de empezar:** exportá un respaldo JSON desde **Ajustes → Datos** en cada dispositivo. El servidor nuevo arranca **vacío** y **el respaldo no se puede importar en la v1** (está en las mejoras futuras): sirve para consultar y recuperar a mano. Al entrar con el usuario nuevo, la app borra los datos locales de la cuenta anterior, incluidos los cambios que no se hayan subido.

1. **Supabase:** proyecto nuevo ([paso 1](#1-supabase-crear-el-proyecto)).
2. **Migraciones**, en **SQL Editor**, de a una y en este orden (pegar el archivo completo → **Run**):
   1. `supabase/migrations/20261001000000_initial_schema.sql`: tablas, RLS, bucket `attachments`, rol `powersync_role` y publicación `powersync`.
   2. `supabase/migrations/20261002120000_cleanup_functions.sql`: funciones de limpieza.
   3. `supabase/migrations/20261002120100_cleanup_schedule.sql`: tarea diaria con `pg_cron`.
   4. `supabase/migrations/20261003120000_attachment_files.sql`: restricciones de adjuntos y papelera de Storage (necesita la 2).
3. **Rol de PowerSync y login:** [paso 3](#3-supabase-contraseña-del-rol-de-powersync) y [paso 4](#4-supabase-autenticación-login-con-código-por-email) completos (usuario, registros cerrados, código de 8 números, SMTP con Resend y plantilla).
4. **PowerSync:** instancia nueva conectada al proyecto nuevo, con Supabase Auth y las Sync Streams de `powersync/sync-config.yaml` ([paso 6](#6-powersync-crear-la-instancia-y-conectarla)).
5. **Limpieza programada:** secret key `cleanup`, Edge Function y secretos de Vault ([pasos 12.1, 12.3 y 12.4](#12-limpieza-programada-supabase)).
6. **`.env`** con la URL, la publishable key y la URL de PowerSync nuevas ([pasos 5 y 6](#5-supabase-datos-para-el-env)).
7. **Volver a compilar y publicar todo**, porque los valores del `.env` quedan dentro de cada build:
   - Web: `npm run build` y publicar ([paso 10](#10-netlify-publicar-la-web)).
   - Android: `npm run android:release` e instalar ([paso 9](#9-android)).
8. **Comprobar:** iniciar sesión, crear una carpeta en un dispositivo y verla en otro; adjuntar un archivo y verlo en Storage; la consulta de RLS del [paso 7](#comprobar-la-seguridad-rls).

## 15. Publicar una versión nueva

1. En la PC: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` y `npm run e2e` en verde.
2. Subí la versión en `package.json` con `npm version <x.y.z> --no-git-tag-version`. Se ve en Ajustes y define el `versionCode` del APK.
3. Si la versión trae migraciones nuevas en `supabase/migrations/`, corrélas en el SQL Editor **antes** de publicar (en orden, solo las nuevas).
4. **Web:** `npm run build` y publicar `dist` ([paso 10](#10-netlify-publicar-la-web)). Quien tenga la app abierta ve "Hay una nueva versión disponible" con **Actualizar**; una pestaña con la versión anterior se recarga sola si le falta alguna parte.
5. **Android:** `npm run android:release` e instalar encima de la anterior (se conservan los datos).
6. Commit y, cuando quieras, push (con un repaso de que no haya secretos: el repositorio es público).
