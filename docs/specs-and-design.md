# Mis Tareas — Especificación para desarrollar con Claude Code

> **Nombre de la app:** "Mis Tareas" es un nombre provisorio. Usar una constante única (`APP_NAME`) y un `appId` provisorio (`com.example.mistareas`) para poder cambiarlos fácilmente.
> **Idioma de la interfaz:** español rioplatense, tono simple y breve. Textos centralizados en `src/i18n/es.ts`.
> **Usuario:** una sola persona (uso personal). El diseño deja la puerta abierta para compartir carpetas en el futuro, pero **no se implementa ahora**.

---

## Índice

0. [Cómo trabajar con este documento (leer primero)](#0-cómo-trabajar-con-este-documento-leer-primero)
1. [Visión y alcance](#1-visión-y-alcance)
2. [Decisiones cerradas y supuestos](#2-decisiones-cerradas-y-supuestos)
3. [Stack y arquitectura](#3-stack-y-arquitectura)
4. [Estructura del proyecto](#4-estructura-del-proyecto)
5. [Modelo de datos](#5-modelo-de-datos)
6. [Reglas de negocio](#6-reglas-de-negocio)
7. [Requisitos funcionales por módulo](#7-requisitos-funcionales-por-módulo)
8. [Offline y sincronización](#8-offline-y-sincronización)
9. [Notificaciones y tareas ancladas (Android)](#9-notificaciones-y-tareas-ancladas-android)
10. [Adjuntos: links y archivos](#10-adjuntos-links-y-archivos)
11. [Diseño UX/UI](#11-diseño-uxui)
12. [PWA y versión desktop](#12-pwa-y-versión-desktop)
13. [Seguridad y privacidad](#13-seguridad-y-privacidad)
14. [Plan de desarrollo por fases](#14-plan-de-desarrollo-por-fases)
15. [Testing y criterios de calidad](#15-testing-y-criterios-de-calidad)
16. [Mejoras futuras (fuera de la v1)](#16-mejoras-futuras-fuera-de-la-v1)
17. [Riesgos y puntos a verificar](#17-riesgos-y-puntos-a-verificar)
18. [Anexo: CLAUDE.md sugerido y prompts de arranque](#18-anexo-claudemd-sugerido-y-prompts-de-arranque)

---

## 0. Cómo trabajar con este documento (leer primero)

Este documento es la fuente de verdad del proyecto. Reglas para Claude Code:

1. **Trabajar de a una fase por vez** (sección 14). No adelantar funcionalidades de fases posteriores. Al terminar una fase: correr lint, typecheck y tests, resumir qué se hizo, listar lo pendiente y **esperar confirmación del usuario** antes de pasar a la siguiente.
2. **No inventar APIs ni versiones.** Antes de usar una librería o servicio (Supabase, PowerSync, Capacitor, plugins, vite-plugin-pwa, etc.), **leer su documentación vigente** y verificar versiones, límites y planes gratuitos. Varios puntos de este documento están marcados con **[VERIFICAR]**.
3. **Ante una ambigüedad real, preguntar al usuario** en lugar de asumir. Si se toma una decisión no cubierta acá, documentarla en `docs/DECISIONS.md`.
4. **Offline-first desde el inicio.** Toda lectura y escritura de la app pasa por la base local. Nunca escribir UI que dependa de una respuesta de red para mostrar o modificar datos.
5. **Aislar lo específico de cada plataforma** (notificaciones, anclado, selector de archivos, compartir) detrás de interfaces en `src/platform/`. Así se puede migrar el desktop a Tauri en el futuro sin tocar la UI.
6. **Simplicidad.** Solo el título de una tarea es obligatorio. Toda otra función es opcional y no debe estorbar a quien no la usa.
7. **Commits pequeños y descriptivos** (Conventional Commits). Un commit o más por tarea de la fase.
8. **Datos que el usuario debe aportar** (pedirlos cuando hagan falta, nunca inventarlos):
   - Credenciales del proyecto de Supabase (URL y anon key) y, si corresponde, de PowerSync.
   - Modelo y **versión de Android** del celular (importa para el anclado de notificaciones, ver sección 9).
   - Nombre definitivo de la app y `appId`.
   - Dominio o plataforma de hosting para la PWA.

---

## 1. Visión y alcance

### 1.1 Qué es
Una app personal de lista de tareas, organizada en **carpetas anidadas sin límite de profundidad**. Pensada para separar áreas de la vida y el trabajo: por ejemplo, una carpeta "Universidad" con sus entregas y, para trabajo de software a medida, una carpeta por cliente (con subcarpetas por proyecto si hace falta) donde anotar cambios y modificaciones pendientes.

### 1.2 Plataformas
| Plataforma | Tecnología | Prioridad |
|---|---|---|
| **Android (principal)** | La misma app React empaquetada con **Capacitor** | Alta: es el uso principal |
| **Web / Desktop** | **PWA** instalable (Chrome/Edge) | Media: debe funcionar completa en lo esencial |
| Desktop futuro | Posible migración a **Tauri** | Fuera de la v1 |

Una sola base de código React. Lo que se modifica en un dispositivo se refleja en el otro (sincronización automática).

### 1.3 Qué incluye la v1
- Carpetas anidadas ilimitadas (crear, editar, borrar, mover, reordenar, color).
- Tareas con: título (obligatorio), descripción, fecha límite, prioridad, color, etiquetas con color, links y archivos adjuntos, marcar como hecha.
- Reordenar tareas (arrastrar y botones subir/bajar), mover entre carpetas, editar, eliminar con "Deshacer".
- Vistas: **Hoy / Próximas** (todas las carpetas) y filtro **Solo prioritarias**.
- **Búsqueda global** (título, descripción, etiquetas).
- Funcionamiento **offline completo** y sincronización entre dispositivos.
- **Solo Android:** avisos automáticos de vencimiento (configurables), recordatorios personalizados (varias fechas), tareas **ancladas** con notificación fija.
- Configuración: tema, días de retención de completadas, avisos de vencimiento, **exportar respaldo JSON**, cuenta.
- Login passwordless: email + código de verificación (OTP) enviado por correo. Sin pantalla de registro pública.

### 1.4 Qué NO incluye la v1
Tareas recurrentes, estados intermedios (en progreso), subtareas, compartir carpetas, archivo/historial consultable de tareas completadas, captura rápida desde un botón o "compartir hacia la app", importar respaldo, notificaciones en desktop, widgets de pantalla de inicio. Ver sección 16.

---

## 2. Decisiones cerradas y supuestos

### 2.1 Decisiones cerradas (confirmadas por el usuario)

| # | Decisión |
|---|---|
| D1 | React + TypeScript. PWA para web/desktop. Capacitor para Android. |
| D2 | Base en la nube: **Supabase** (Postgres + Auth + Storage). Enfoque **local-first** con sincronización. |
| D3 | **Offline imprescindible:** ver toda la app y hacer cambios sin conexión; se sincroniza al volver internet. |
| D4 | Carpetas anidadas **sin límite** de profundidad. Una carpeta puede tener subcarpetas y tareas a la vez. |
| D5 | Solo el **título** es obligatorio en una tarea. Todo lo demás es opcional. |
| D6 | Subtareas: **no** (por ahora). |
| D7 | Tareas completadas: se mueven al final de su carpeta y se **borran definitivamente** a los X días (configurable). Archivo consultable: mejora futura. |
| D8 | Etiquetas **globales**, con color, varias por tarea. |
| D9 | Adjuntos: **links y archivos/fotos** (los archivos van en una fase aparte). |
| D10 | Recordatorios personalizados: se pueden crear **todos los que se quieran** por tarea; cada recordatorio admite **una o varias fechas/horas**; al dispararse una fecha, **se borra** de la base (y el recordatorio se borra cuando no le quedan fechas). |
| D11 | Avisos automáticos de vencimiento: **configurables** (cuántos días antes, a qué hora, y activar/desactivar). |
| D12 | Tarea **anclada:** notificación fija que solo se quita desde la app (desanclar). Solo Android. |
| D13 | Recordatorios y anclado **no se desarrollan para desktop**. |
| D14 | Reordenar tareas: **arrastrar y soltar + botones subir/bajar**. |
| D15 | Prioritarias: marca visual + filtro "Solo prioritarias" + **suben al principio**; al desmarcar vuelven a su ubicación original. |
| D16 | Login: **passwordless**, email + código de verificación (OTP) de un solo uso enviado por correo (ver `design/screens/auth.md`). Sin registro público (usuario único creado desde el panel de Supabase). Sesión persistente **sin expiración forzada** en mobile, desktop y web — no se vuelve a pedir el código salvo logout explícito. Futuro (fuera de v1): opción en Configuración para crear cuentas adicionales cuando se comparta la app. |
| D17 | Tema: **claro y oscuro**, sigue al dispositivo por defecto, con opción en Configuración para forzar uno. |
| D18 | Funciones extra incluidas: **búsqueda global**, **exportar respaldo JSON** (botón en Configuración), **deshacer al borrar**. |
| D19 | Compartir carpetas: no ahora, pero el modelo de datos queda preparado (UUID, `owner_id`, RLS). |
| D20 | Diseño: muy simple, rápido y cómodo, **mobile-first**, paleta neutra con un solo acento. |

### 2.2 Supuestos tomados (confirmar con el usuario si se quiere cambiar)

| # | Supuesto |
|---|---|
| S1 | Retención de completadas por defecto: **7 días**, configurable entre 1 y 90. |
| S2 | Elementos eliminados (borrado lógico para "Deshacer") se **purgan definitivamente a los 30 días**. |
| S3 | Avisos de vencimiento por defecto: **1 día antes y el mismo día, a las 09:00**. Opciones de "días antes": 0, 1, 2, 3, 7. |
| S4 | Tamaño máximo por archivo adjunto: **10 MB**. Las imágenes se comprimen antes de subir. |
| S5 | El **tema** (claro/oscuro/sistema) es una preferencia **por dispositivo** (no se sincroniza). El resto de la configuración sí se sincroniza. |
| S6 | La **fecha límite** es un día (sin hora). Los avisos usan la hora configurada. |
| S7 | En la carpeta raíz no hay tareas, solo carpetas. Toda tarea vive dentro de una carpeta. |
| S8 | Al crear tareas, **Enter** crea la tarea y deja el panel abierto para cargar varias seguidas (el usuario va a cargar listas largas). Un botón "Listo" cierra el panel. **Reemplazado por X52** (`docs/DECISIONS.md`): ventana con "Crear" y "Crear y agregar otra". |
| S9 | El filtro "Solo prioritarias" actúa sobre la carpeta actual **y todas sus subcarpetas** (en la raíz, sobre todo). |
| S10 | Los controles de recordatorio y anclado **no se muestran** en web/desktop; si una tarea los tiene (creados en el celular), se muestra un indicador de solo lectura. |

---

## 3. Stack y arquitectura

### 3.1 Tecnologías (verificar versiones vigentes al instalar)

| Capa | Elección |
|---|---|
| Lenguaje | TypeScript (modo estricto) |
| UI | React + Vite |
| Estilos | Tailwind CSS + componentes accesibles (shadcn/ui sobre Radix). Íconos: `lucide-react` |
| Routing | React Router |
| Formularios | `react-hook-form` + `zod` |
| Fechas | `date-fns` con locale `es` |
| Estado de UI | Zustand (solo estado de interfaz, nunca datos de negocio) |
| Drag & drop | `@dnd-kit/*` |
| Paneles inferiores | `vaul` (drawer estilo mobile) o equivalente accesible |
| Toasts | `sonner` |
| Orden manual | `fractional-indexing` (claves de orden en string) |
| PWA | `vite-plugin-pwa` (Workbox) |
| Nativo Android | Capacitor + plugins |
| Backend | Supabase (Postgres, Auth, Storage, Edge Functions, pg_cron) |
| Sincronización offline | **PowerSync** sobre Supabase (ver 3.2) |
| Tests | Vitest + Testing Library; Playwright para e2e web |

### 3.2 Capa de datos y sincronización: dos caminos

**Camino A (recomendado): Supabase + PowerSync.**
- Base local SQLite en el dispositivo (la app lee y escribe siempre ahí).
- PowerSync sincroniza con Supabase Postgres y mantiene una cola de cambios pendientes mientras no hay conexión.
- Lecturas reactivas: las pantallas se actualizan solas cuando cambian los datos (locales o sincronizados).
- **[VERIFICAR]** documentación vigente de PowerSync: SDK para web, SDK/soporte para Capacitor, reglas de sincronización (Sync Rules / Sync Streams), conector (`fetchCredentials` + `uploadData`), plan gratuito y límites, requisitos de configuración con Vite (workers, WASM).
- **[VERIFICAR]** si hay SDK oficial para Capacitor. Si no lo hay, usar el SDK web dentro del WebView.

**Camino B (alternativa si A no encaja): sincronización propia.**
- Base local con Dexie (IndexedDB), cola de operaciones pendientes ("outbox"), subida en orden, bajada incremental por `updated_at`, resolución de conflictos "último cambio gana", borrado lógico con `deleted_at`.
- Más código y más riesgo de bugs. Usar solo si PowerSync no es viable.

> **Regla:** definir una interfaz de repositorios (`src/data/repositories/*`) que oculte la tecnología elegida. La UI nunca importa PowerSync ni Dexie directamente.

### 3.3 Diagrama conceptual

```
┌──────────────── Dispositivo (Android / Web / Desktop PWA) ───────────────┐
│  UI React ──► Repositorios ──► SQLite local (lectura/escritura inmediata)│
│                                  │                                       │
│                         Cola de cambios ◄──► Motor de sync (PowerSync)   │
│  platform/ (Notificaciones, Archivos, Share) ── Capacitor (solo Android) │
└────────────────────────────────────┬─────────────────────────────────────┘
                                     │ (cuando hay internet)
                      ┌──────────────▼───────────────┐
                      │ Supabase: Postgres + Auth    │
                      │ Storage (archivos) + Cron    │
                      └──────────────────────────────┘
```

### 3.4 Capa de plataforma (`src/platform/`)

Interfaces que tienen una implementación real en Capacitor y una vacía (o limitada) en web:

```ts
// src/platform/types.ts (referencia, ajustar al implementar)
export interface PlatformInfo {
  isNative: boolean;        // true solo en Android/Capacitor
  isAndroid: boolean;
}

export interface NotificationService {
  isSupported(): boolean;
  getPermissionState(): Promise<'granted' | 'denied' | 'prompt'>;
  requestPermission(): Promise<boolean>;
  // Recalcula y sincroniza TODAS las notificaciones locales con el estado actual de la base
  reconcile(desired: DesiredNotifications): Promise<void>;
  sendTest(): Promise<void>;
  getDiagnostics(): Promise<NotificationDiagnostics>;
}

export interface FileService {
  pickFiles(): Promise<PickedFile[]>;
  takePhoto?(): Promise<PickedFile | null>;
  saveAndShare(filename: string, data: Blob): Promise<void>; // para exportar JSON
}
```

- `platform/capacitor/*`: implementación Android.
- `platform/web/*`: implementación para navegador (`NotificationService` sin funcionalidad; `FileService` con `<input type="file">` y descarga por Blob).
- Selección en un solo lugar (`platform/index.ts`) usando `Capacitor.isNativePlatform()`.
- Para una futura migración a **Tauri** bastará con agregar `platform/tauri/*`.

---

## 4. Estructura del proyecto

```
/
├─ CLAUDE.md                     # instrucciones persistentes (ver anexo)
├─ docs/
│  ├─ DECISIONS.md               # decisiones nuevas que se vayan tomando
│  └─ SETUP.md                   # cómo levantar, desplegar y compilar el APK
├─ supabase/
│  ├─ migrations/                # SQL versionado
│  └─ functions/cleanup/         # Edge Function de limpieza programada
├─ android/                      # proyecto nativo generado por Capacitor (+ código Kotlin propio si hace falta)
├─ public/                       # íconos PWA, favicon
├─ src/
│  ├─ app/                       # router, providers, layouts (mobile / desktop)
│  ├─ features/
│  │  ├─ auth/
│  │  ├─ folders/
│  │  ├─ tasks/
│  │  ├─ tags/
│  │  ├─ today/                  # vista Hoy / Próximas
│  │  ├─ search/
│  │  ├─ reminders/              # (nativo)
│  │  ├─ attachments/
│  │  ├─ settings/
│  │  └─ sync/                   # estado de sincronización
│  ├─ data/
│  │  ├─ schema.ts               # esquema local
│  │  ├─ connector.ts            # conexión con Supabase
│  │  └─ repositories/           # acceso a datos (única puerta de entrada)
│  ├─ platform/                  # ver 3.4
│  ├─ lib/                       # utilidades puras (orden, árbol, fechas, colores, export)
│  ├─ ui/                        # componentes de interfaz reutilizables
│  └─ i18n/es.ts                 # textos
├─ capacitor.config.ts
├─ vite.config.ts
└─ package.json
```

Las funciones puras de `src/lib/` (árbol de carpetas, ordenamiento, cálculo de avisos, retención, validación de ciclos, exportación) **deben tener tests unitarios**.

IMPORTANTE: Todo el código y nombres de archivos debe ir en inglés sin excepción. Solo quiero que dejes en español el idioma de la aplicación, los comentarios en el código (los cuales deben ser simples y descriptivos. Sin emojis ni nada extra) y la documentación.

Las variables, funciones, y todo el código y nombre de archivos va en inglés.

---

## 5. Modelo de datos

### 5.1 Principios
- **IDs UUID v4 generados en el cliente** (`crypto.randomUUID()`) para poder crear registros sin conexión.
- Todas las tablas llevan `owner_id` (dueño) para aplicar seguridad por usuario (RLS) y permitir compartir en el futuro.
- **Borrado lógico** (`deleted_at`) en carpetas, tareas, etiquetas y adjuntos para soportar "Deshacer". Se purga definitivamente a los 30 días.
- **Orden manual** con claves de texto (`position`) generadas con `fractional-indexing`: insertar o mover un elemento modifica solo ese registro.
- Colores guardados como **nombre de token** (ej. `"indigo"`), no como hex, para adaptarse a tema claro/oscuro.
- Fecha límite como `date` (sin zona horaria). Momentos exactos (`fire_at`, `done_at`, etc.) como `timestamptz` en UTC; se muestran en la zona horaria local del dispositivo.
- **[VERIFICAR]** PowerSync exige una columna `id` (texto) en todas las tablas y no admite arrays nativos; guardar listas como JSON en texto.

### 5.2 Esquema SQL para Supabase (migración inicial)

> Ajustar a las reglas de sincronización de PowerSync. Los tipos del lado local (SQLite) serán `text`, `integer` y `real`.

```sql
create extension if not exists pgcrypto;

-- ============ CARPETAS ============
create table public.folders (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  parent_id   uuid references public.folders(id) on delete cascade,  -- null = carpeta raíz
  name        text not null check (char_length(btrim(name)) > 0),
  color       text,                       -- token de color o null
  position    text not null,              -- clave fractional-indexing entre hermanas
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);
create index folders_owner_parent_idx on public.folders (owner_id, parent_id);

-- ============ TAREAS ============
create table public.tasks (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  folder_id    uuid not null references public.folders(id) on delete cascade,
  title        text not null check (char_length(btrim(title)) > 0),
  description  text,
  due_date     date,                       -- fecha límite (día)
  is_priority  boolean not null default false,
  color        text,
  position     text not null,              -- orden manual (NO cambia al marcar prioridad)
  is_done      boolean not null default false,
  done_at      timestamptz,
  is_pinned    boolean not null default false,   -- anclada (solo Android)
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz
);
create index tasks_owner_folder_idx on public.tasks (owner_id, folder_id);
create index tasks_owner_due_idx    on public.tasks (owner_id, due_date) where is_done = false;
create index tasks_owner_done_idx   on public.tasks (owner_id, is_done, done_at);

-- ============ ETIQUETAS ============
create table public.tags (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name        text not null check (char_length(btrim(name)) > 0),
  color       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);
create unique index tags_owner_name_uidx on public.tags (owner_id, lower(name)) where deleted_at is null;

create table public.task_tags (
  id          uuid primary key default gen_random_uuid(),   -- PowerSync requiere id
  owner_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  task_id     uuid not null references public.tasks(id) on delete cascade,
  tag_id      uuid not null references public.tags(id) on delete cascade,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (task_id, tag_id)
);

-- ============ ADJUNTOS (links y archivos) ============
create table public.attachments (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  task_id       uuid not null references public.tasks(id) on delete cascade,
  kind          text not null check (kind in ('link','file')),
  label         text,                       -- texto a mostrar (opcional)
  url           text,                       -- para kind = 'link'
  storage_path  text,                       -- para kind = 'file' (ruta en Storage)
  file_name     text,
  mime_type     text,
  size_bytes    bigint,
  position      text not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz,
  check ((kind = 'link' and url is not null) or (kind = 'file' and storage_path is not null))
);

-- ============ RECORDATORIOS PERSONALIZADOS ============
create table public.reminders (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  task_id     uuid not null references public.tasks(id) on delete cascade,
  message     text,                         -- null = usar el título de la tarea
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.reminder_times (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  reminder_id  uuid not null references public.reminders(id) on delete cascade,
  task_id      uuid not null references public.tasks(id) on delete cascade,
  fire_at      timestamptz not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index reminder_times_owner_fire_idx on public.reminder_times (owner_id, fire_at);

-- ============ CONFIGURACIÓN (sincronizada) ============
create table public.user_settings (
  id                        uuid primary key default gen_random_uuid(),
  owner_id                  uuid not null unique default auth.uid() references auth.users(id) on delete cascade,
  completed_retention_days  integer not null default 7 check (completed_retention_days between 1 and 90),
  due_alerts_enabled        boolean not null default true,
  due_alert_offsets         text    not null default '[1,0]',   -- JSON: días antes del vencimiento
  due_alert_time            text    not null default '09:00',   -- HH:mm local
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);
-- (El tema NO va acá: es una preferencia local por dispositivo.)
```

### 5.3 Triggers y seguridad (migración inicial)

```sql
-- updated_at automático
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- RLS + trigger en todas las tablas
do $$
declare t text;
begin
  foreach t in array array['folders','tasks','tags','task_tags','attachments','reminders','reminder_times','user_settings']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format($p$create policy "%1$s_owner_all" on public.%1$I
      for all to authenticated
      using (owner_id = (select auth.uid()))
      with check (owner_id = (select auth.uid()))$p$, t);
    execute format('create trigger %1$s_set_updated_at before update on public.%1$I
      for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

-- Evitar ciclos en carpetas (una carpeta no puede ser hija de sí misma ni de sus descendientes)
create or replace function public.folders_prevent_cycle() returns trigger
language plpgsql as $$
begin
  if new.parent_id is null then return new; end if;
  if new.parent_id = new.id then raise exception 'Una carpeta no puede ser su propia carpeta padre'; end if;
  if exists (
    with recursive d as (
      select id from public.folders where parent_id = new.id
      union all
      select f.id from public.folders f join d on f.parent_id = d.id
    ) select 1 from d where id = new.parent_id
  ) then raise exception 'No se puede mover una carpeta dentro de sus propias subcarpetas'; end if;
  return new;
end $$;
create trigger folders_prevent_cycle_trg before insert or update of parent_id on public.folders
  for each row execute function public.folders_prevent_cycle();

-- Fila de configuración por defecto al crearse un usuario
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin insert into public.user_settings (owner_id) values (new.id) on conflict do nothing; return new; end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();
```

### 5.4 Storage (archivos adjuntos)
- Bucket privado `attachments`.
- Ruta de objeto: `{owner_id}/{task_id}/{attachment_id}-{file_name_sanitizado}`.
- Política en `storage.objects`: solo el dueño accede a objetos cuyo primer segmento de carpeta sea su `auth.uid()`:

```sql
create policy "attachments_owner_rw" on storage.objects
  for all to authenticated
  using (bucket_id = 'attachments' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'attachments' and (storage.foldername(name))[1] = (select auth.uid())::text);
```

### 5.5 Tablas solo locales (no se sincronizan)
- `attachment_local_state`: `attachment_id`, `upload_status` (`pending|uploading|uploaded|failed`), `local_path`, `last_error`.
- `notif_registry`: `id integer autoincrement` (ID numérico que se usa como ID de notificación Android), `kind` (`due|reminder|pin`), `ref_id`, `fire_at`. Único por (`kind`, `ref_id`, `fire_at`).

### 5.6 Futuro: compartir carpetas (NO implementar ahora)
Mantener `owner_id` y UUID. Más adelante: tabla `folder_members` y políticas RLS que contemplen miembros. No agregar nada de esto en la v1.

Aclaración para cuando te lo pida: Cuando lo necesite, te voy a pedir que me hagas el paso a paso para poder darte permisos de lectura sobre la base de datos en supabase solo dentro de este proyecto, para que puedas realizar verificaciones por vos mismo. Es importante que solo se mantenga dentro de este proyecto, para que no se "pise" con las conexiones que tengo en otros proyectos con otras bases de datos.
---

## 6. Reglas de negocio

### 6.1 Árbol de carpetas
- `parent_id = null` ⇒ carpeta raíz. Profundidad ilimitada.
- No se puede mover una carpeta dentro de sí misma ni de sus descendientes (validar en cliente y en el trigger de la base).
- Se pueden mover carpetas a la raíz o a cualquier carpeta válida.
- Al calcular conteos, las carpetas muestran cantidad de **tareas pendientes** (incluye subcarpetas). Usar consulta recursiva.

### 6.2 Orden
- **Orden guardado** = `position` (clave fractional-indexing) entre hermanos (mismo `folder_id` o mismo `parent_id`).
- **Orden mostrado de tareas pendientes** = `is_priority DESC`, luego `position ASC`.
  - Marcar prioridad **no modifica `position`**: la tarea "sube" solo por el criterio de visualización. Al desmarcar, vuelve sola a su lugar original.
  - Reordenar (arrastrar o botones) actúa **dentro del grupo visible** de la tarea (prioritarias entre prioritarias; no prioritarias entre no prioritarias). Calcular la nueva `position` entre los vecinos de ese grupo.
- **Botones subir/bajar:** intercambian la posición con el vecino inmediato del mismo grupo.
- **Mover a otra carpeta:** cambia `folder_id` y asigna `position` al final de la carpeta destino.
- **Completadas:** se muestran en una sección "Completadas" al final de la carpeta, ordenadas por `done_at DESC`. Al desmarcar "hecha", la tarea vuelve a su `position` original (no se modificó).

### 6.3 Completar tareas
- Marcar como hecha: `is_done = true`, `done_at = now()`. Desmarcar: `is_done = false`, `done_at = null`.
- Al completar una tarea: **desanclar** si estaba anclada (`is_pinned = false`) y cancelar sus avisos de vencimiento. Los recordatorios personalizados pendientes **se mantienen** salvo que el usuario los borre (decisión simple: no tocarlos).
- La sección "Completadas" muestra "Se borra en N días" por tarea.

### 6.4 Retención y limpieza
- **Completadas:** se borran definitivamente cuando `done_at < now() - completed_retention_days`. La limpieza se ejecuta (a) en el servidor con una tarea programada diaria y (b) en el cliente al abrir la app (idempotente). Al borrar una tarea se borran sus adjuntos y archivos de Storage.
- **Eliminados lógicos (papelera interna):** el "Deshacer" dura unos segundos en la interfaz (aprox. 6 s), pero el registro se conserva con `deleted_at` y se purga a los 30 días (S2). **No hay pantalla de papelera en la v1.**
- **Recordatorios:** al dispararse una fecha se borra su `reminder_times`; si el recordatorio queda sin fechas, se borra el `reminders`.

### 6.5 Borrado y "Deshacer"
- Eliminar una **tarea**: `deleted_at = now()`. Aparece un aviso con "Deshacer" (≈ 6 s). Deshacer: `deleted_at = null`.
- Eliminar una **carpeta**: pide **confirmación** indicando cuántas subcarpetas y tareas contiene. Se marca con **el mismo** `deleted_at` la carpeta, todas sus subcarpetas y todas las tareas contenidas que no estuvieran ya eliminadas. "Deshacer" restaura únicamente los registros cuyo `deleted_at` coincide con ese valor exacto (así no se "resucitan" tareas eliminadas antes).
- Cancelar todas las notificaciones asociadas a lo eliminado; reprogramarlas si se deshace.
- Eliminar una **etiqueta**: se quita de todas las tareas (borrar sus `task_tags`) y se marca `deleted_at`.

### 6.6 Avisos automáticos de vencimiento
Para cada tarea **no hecha, no eliminada, con `due_date`** y para cada valor `d` de `due_alert_offsets`:
`fire_at = (due_date − d días) a la hora due_alert_time (hora local)`. Solo se programa si `fire_at` está en el futuro. No se guardan filas en la base: se **calculan** y se programan localmente. Si se cambia la configuración o la fecha de la tarea, se recalculan.

### 6.7 Fechas y zonas horarias
- `due_date`: cadena `YYYY-MM-DD` interpretada en la fecha local. No convertir con zonas horarias.
- Instantes (`fire_at`, `done_at`, `created_at`): ISO 8601 en UTC; mostrar en hora local.
- Etiquetas de fecha relativas: "Hoy", "Mañana", "Ayer", "Vencida hace N días".

### 6.8 Validaciones
- Título obligatorio (se recorta con `trim`), máximo razonable (ej. 200 caracteres). Nombre de carpeta y etiqueta obligatorios.
- Etiquetas únicas por nombre (sin distinguir mayúsculas).
- URL de link: aceptar `http(s)://`; si el usuario escribe un dominio sin protocolo, anteponer `https://`.

---

## 7. Requisitos funcionales por módulo

> Convención: **[MVP]** requisito del núcleo; **[NATIVO]** solo Android; **[FASE n]** indica la fase del plan (sección 14).

### 7.1 Autenticación (Fase 1)
- AUTH-1 Pantalla única de login: un solo campo de **email** y botón "Enviar código" (`supabase.auth.signInWithOtp({ email })`, OTP numérico, **nunca** magic link). **No hay pantalla de registro** ni de recuperación de contraseña — no hay contraseña (ver `design/screens/auth.md`).
- AUTH-2 Paso de verificación **en el mismo espacio** (el campo de email se reemplaza por el campo de código, sin ruta nueva): código de 6 dígitos → `supabase.auth.verifyOtp({ email, token, type: 'email' })`. "Reenviar código" reinicia el timer de expiración; "Cambiar email" vuelve al paso 1 descartando el código anterior.
- AUTH-3 Registros públicos (signups) **desactivados** en Supabase Auth; el usuario se crea una vez desde el panel. Documentar el paso en `docs/DECISIONS.md` (desde Fase 0).
- AUTH-4 **Persistencia de sesión:** cliente Supabase con `persistSession: true` y `autoRefreshToken: true`. El access token se renueva solo en segundo plano con el refresh token; sin fecha de vencimiento forzada mientras no haya logout explícito ni invalidación confirmada por el servidor. La app debe abrir y funcionar **sin conexión** sin pedir el código de nuevo. **Nunca cerrar sesión por un error de red.**
- AUTH-5 Storage de sesión por plataforma (detalle de seguridad en sección 13):
  - Web/PWA: `localStorage` (default de `supabase-js`).
  - Android (Capacitor): adapter de storage propio sobre `@capacitor/preferences`, pasado como `storage` al cliente de Supabase (sobrevive a que el WebView limpie su storage por presión de memoria).
  - Desktop (PWA instalada; futuro Tauri): `localStorage` en PWA; si se migra a Tauri, `tauri-plugin-store` o el keychain del OS como adapter equivalente.
- AUTH-6 "Cerrar sesión" en Configuración (aclarar que se conservarán/eliminarán los datos locales según lo decidido en la implementación; por defecto, **limpiar la base local al cerrar sesión** y avisarlo).

### 7.2 Carpetas (Fase 3)
- FOL-1 Crear carpeta (nombre obligatorio, color opcional) en la raíz o dentro de otra.
- FOL-2 Editar nombre y color. Borrar con confirmación y "Deshacer" (ver 6.5).
- FOL-3 **Mover** carpeta a otra (selector en árbol; excluye la carpeta misma y sus descendientes) o a la raíz.
- FOL-4 **Reordenar** carpetas hermanas: arrastrar + botones subir/bajar.
- FOL-5 Navegación: tocar una carpeta entra a ella. Muestra **ruta clickeable** (breadcrumb) y permite subir de nivel.
- FOL-6 Cada fila de carpeta muestra: color, nombre, cantidad de pendientes (incluye subcarpetas) e indicador si tiene tareas vencidas.
- FOL-7 Dentro de una carpeta: subcarpetas arriba, tareas abajo. Botón "+ Subcarpeta" en el encabezado de la sección de subcarpetas.
- FOL-8 Estado vacío con guía ("Todavía no hay nada acá. Tocá + para crear una tarea").

### 7.3 Tareas (Fase 4)
- TSK-1 **Crear:** panel inferior con **solo el campo título** y teclado listo. Opciones desplegables (chips) opcionales: fecha, prioridad, etiquetas, color. **Enter** crea y deja el panel abierto (S8); "Listo" cierra. **Cambiado (X51, X52):** se crea en una ventana modal con todos los campos y botones "Crear" / "Crear y agregar otra".
- TSK-2 Lista de tareas: casilla para completar, título, indicadores pequeños (fecha límite, etiquetas, estrella de prioridad, adjuntos, campana, pin) y **franja de color** al costado si tiene color.
- TSK-3 **Detalle/edición** (panel que sube desde abajo en mobile; panel lateral en desktop): título, descripción (texto con alto automático), fecha límite (atajos: Hoy, Mañana, Próxima semana, Sin fecha), prioridad, color, etiquetas, carpeta (mover), adjuntos, recordatorios y anclar **[NATIVO]**, eliminar. **Cambiado (X51, X53, X55):** ventana modal con guardado explícito; en la lista, una flecha despliega los detalles sin bloquear la app.
- TSK-4 **Completar:** tocar la casilla o deslizar hacia un lado. La tarea pasa a "Completadas".
- TSK-5 **Eliminar:** deslizar hacia el otro lado o desde el menú. Con "Deshacer".
- TSK-6 **Prioridad:** alternar desde el menú o el detalle. Reglas en 6.2.
- TSK-7 **Reordenar:** arrastrar desde el asa **y** botones "Subir/Bajar" en el menú de la tarea.
- TSK-8 **Mover a otra carpeta:** selector en árbol.
- TSK-9 Sección **Completadas** (colapsable) con "Se borra en N días" y opción de desmarcar.
- TSK-10 Atajo para **duplicar** tarea: no incluido en v1.

### 7.4 Etiquetas (Fase 5)
- TAG-1 Crear etiquetas desde el selector de la tarea (crear al vuelo) y administrarlas en Configuración → Etiquetas (renombrar, color, eliminar).
- TAG-2 Varias etiquetas por tarea; se muestran como chips con color.
- TAG-3 Filtro por etiqueta en la lista de la carpeta y en la búsqueda.

### 7.5 Vistas globales (Fase 5)
- **Hoy / Próximas** (pestaña "Hoy"): tareas pendientes **con fecha límite** de todas las carpetas, agrupadas en: *Vencidas* (rojo suave, arriba), *Hoy*, *Mañana*, *Esta semana*, *Más adelante*. Cada tarea muestra su **ruta de carpeta** debajo del título. Tocar abre el detalle.
- **Solo prioritarias:** chip de filtro disponible en la vista de carpeta y en Hoy; ámbito según S9. Las prioritarias se muestran arriba (regla 6.2).

### 7.6 Búsqueda global (Fase 5)
- SRC-1 Buscar por **título, descripción y nombre de etiquetas**, en todas las carpetas, **sin distinguir mayúsculas ni tildes**.
- SRC-2 Resultados con ruta de carpeta, etiquetas y estado. Tocar abre la tarea (y permite "ir a la carpeta").
- SRC-3 Funciona offline (consulta sobre la base local). Con "debounce" corto al escribir.
- SRC-4 Para el volumen de un uso personal basta filtrar en memoria o con `LIKE` sobre columnas normalizadas; no hace falta un motor de búsqueda externo.

### 7.7 Configuración (Fase 6)
- SET-1 **Tema:** Sistema (por defecto) / Claro / Oscuro. Por dispositivo.
- SET-2 **Días de retención de completadas** (1–90, por defecto 7).
- SET-3 **Avisos de vencimiento** **[NATIVO]**: activar/desactivar, elegir cuántos días antes (0, 1, 2, 3, 7; selección múltiple) y hora.
- SET-4 **Etiquetas:** administrar.
- SET-5 **Exportar respaldo (JSON)**: botón en Configuración (ver 7.8).
- SET-6 **Diagnóstico de notificaciones** **[NATIVO]**: estado de permisos, alarmas exactas, optimización de batería, botón "Enviar notificación de prueba".
- SET-7 **Cuenta:** email, cerrar sesión. Sin contraseña que cambiar (login passwordless, ver 7.1).
- SET-8 **Sincronización:** estado, cambios pendientes, botón "Sincronizar ahora".
- SET-9 Acerca de: versión de la app.

### 7.8 Exportar respaldo JSON (Fase 6)
- Botón en **Configuración**. Genera `mis-tareas-respaldo-YYYY-MM-DD.json`.
- Contenido (versión de formato incluida, sin elementos eliminados lógicamente):

```json
{
  "formatVersion": 1,
  "exportedAt": "2026-01-01T12:00:00Z",
  "folders": [], "tasks": [], "tags": [], "taskTags": [],
  "attachments": [],
  "reminders": [], "reminderTimes": [],
  "settings": {}
}
```
- Los **archivos adjuntos** no se incluyen dentro del JSON (solo sus metadatos y `storage_path`). Dejar documentado.
- Web: descarga por Blob. Android: guardar con Filesystem y abrir el menú de compartir (`saveAndShare`).
- Importar un respaldo queda fuera de la v1.

### 7.9 Estado de sincronización (Fase 2)
- Indicador discreto en el encabezado o en Configuración: **Sincronizado / Sincronizando / Sin conexión (N cambios pendientes) / Error (reintentando)**.
- Aviso sutil cuando se está sin conexión; nunca bloquear la interfaz.

---

## 8. Offline y sincronización

### 8.1 Principios
1. La app **siempre** lee y escribe en la base local; la red es secundaria.
2. Toda escritura local entra en una **cola** que se envía al servidor cuando hay conexión, en orden y con reintentos.
3. Los cambios remotos (hechos en el otro dispositivo) se bajan y actualizan la UI de forma reactiva.
4. **Conflictos:** "último cambio gana" a nivel de campo (enviar solo las columnas modificadas en cada actualización). Dado que es un único usuario, los conflictos reales serán raros.
5. Datos creados offline usan UUID generados en el cliente; no hay dependencia del servidor para crear.

### 8.2 Camino A (PowerSync) — pasos
1. Crear el servicio de PowerSync y vincularlo a la base de Supabase. **[VERIFICAR]** pasos y límites en la documentación vigente.
2. Definir **reglas de sincronización** para que cada usuario reciba solo sus filas (`owner_id = usuario`). Sincronizar todas las tablas de la sección 5.2.
3. Esquema local en `src/data/schema.ts` (equivalente al de la sección 5.2; booleans como `integer`, fechas como `text` ISO, listas como JSON en `text`). Definir además las tablas **solo locales** (5.5).
4. **Conector** (`src/data/connector.ts`): `fetchCredentials` con el JWT de Supabase y `uploadData` que aplica cada operación (PUT/PATCH/DELETE) contra Supabase respetando RLS. Manejar errores permanentes (datos inválidos) sin bloquear la cola indefinidamente.
5. Hooks de lectura reactivos para la UI y **repositorios** de escritura (`FolderRepo`, `TaskRepo`, `TagRepo`, `AttachmentRepo`, `ReminderRepo`, `SettingsRepo`).
6. Estado de sincronización expuesto a la UI (7.9).
7. Verificar el comportamiento con **modo avión**: crear/editar/borrar offline en un dispositivo, volver a conectar y comprobar que el otro dispositivo refleja los cambios.

### 8.3 Cierre de sesión y datos locales
Al cerrar sesión, limpiar la base local y cancelar todas las notificaciones locales (evitar mezclar datos de otra cuenta).

### 8.4 Limpieza programada en el servidor
Edge Function `cleanup` ejecutada **una vez por día** (pg_cron o programación de Supabase; **[VERIFICAR]** mecanismo vigente):
1. Para tareas completadas vencidas por retención (según `user_settings`): recolectar rutas de archivos adjuntos, borrar las tareas (cascada) y borrar los archivos en Storage **mediante la API de Storage** (no con SQL directo).
2. Purgar definitivamente registros con `deleted_at` anterior a 30 días (junto con sus archivos).
3. Borrar `reminder_times` con `fire_at` ya vencida hace más de 1 día (red de seguridad por si algún dispositivo no los limpió).

---

## 9. Notificaciones y tareas ancladas (Android)

> **Solo Android (Capacitor).** En web/desktop no se implementa (D13). Todo pasa por `NotificationService` (3.4).

### 9.1 Tipos de notificación

| Tipo | Origen | Comportamiento |
|---|---|---|
| `due` | Aviso automático de vencimiento (6.6) | Se calcula y programa localmente |
| `reminder` | Recordatorio personalizado (una fila de `reminder_times`) | Se programa en `fire_at`; al dispararse se borra la fila |
| `pin` | Tarea con `is_pinned = true` | Notificación **fija** mostrada de inmediato; solo se quita desde la app |

Al tocar cualquier notificación se abre la app en el **detalle de esa tarea** (deep link `/task/:id`).

### 9.2 Contenido
- `due`: título "Vence hoy" / "Vence mañana" / "Vence en N días" + título de la tarea; cuerpo: ruta de carpeta.
- `reminder`: título = mensaje del recordatorio o, si no hay, el título de la tarea; cuerpo: ruta de carpeta y/o descripción recortada.
- `pin`: título = título de la tarea; cuerpo: fecha límite (si hay) o descripción recortada.

### 9.3 Canales de notificación Android
Crear al iniciar: `due_alerts` (importancia alta), `reminders` (importancia alta), `pinned` (importancia baja: sin sonido ni vibración, para que sea discreta y persistente).

### 9.4 Programación local y reconciliación
Las notificaciones programadas se crean **en el propio dispositivo** (funcionan sin internet). Plugin base: `@capacitor/local-notifications` **[VERIFICAR]** capacidades actuales (`schedule.at`, `allowWhileIdle`, `ongoing`, `autoCancel`, acciones, canales, comprobación de alarmas exactas).

Función central `reconcile()`:
1. **Calcular el conjunto deseado** desde la base: avisos `due` (6.6), `reminder_times` futuros y tareas ancladas.
2. **Leer lo existente** (pendientes y entregadas) del sistema.
3. **Cancelar** lo que ya no corresponde, **programar** lo que falta y **reprogramar** lo que cambió (por ejemplo, el título editado).
4. **Limpieza de recordatorios:** borrar `reminder_times` con `fire_at <= ahora` (ya disparados) y borrar `reminders` que quedaron sin fechas.
5. IDs: cada notificación necesita un entero; usar la tabla local `notif_registry` (5.5) para mapear (`kind`, `ref_id`, `fire_at`) ↔ ID.

Cuándo se ejecuta `reconcile()` (con "debounce" ≈ 500 ms):
- Al iniciar la app y al volver a primer plano.
- Después de cualquier escritura que afecte tareas, recordatorios o configuración.
- Después de recibir cambios de sincronización.
- Después de reiniciar el dispositivo (ver 9.6).

Ventana de programación: no programar más de unos 60 días hacia adelante ni más de ~200 notificaciones pendientes; el resto se programa en reconciliaciones posteriores (Android limita la cantidad de alarmas).

### 9.5 Permisos y compatibilidad **[VERIFICAR] contra la versión de Android del usuario**
- Android 13+: permiso de notificaciones en tiempo de ejecución (`POST_NOTIFICATIONS`). Pedirlo en un momento oportuno (al activar avisos o crear el primer recordatorio), explicando para qué.
- Android 12+: **alarmas exactas** (`SCHEDULE_EXACT_ALARM`; en Android 14 el permiso no viene concedido por defecto). Detectar si falta y llevar al usuario a la pantalla de ajustes correspondiente.
- `RECEIVE_BOOT_COMPLETED` para reprogramar tras reinicio.
- **Optimización de batería** (Samsung, Xiaomi y otros fabricantes pueden matar alarmas): en Configuración → Diagnóstico mostrar guía y acceso directo para excluir la app del ahorro de batería.

### 9.6 Tareas ancladas — diseño y riesgo conocido
Objetivo: notificación fija que **no se pueda sacar deslizando**; solo se quita al **desanclar desde la app** (o al completar/eliminar la tarea).

**Riesgo importante [VERIFICAR en el dispositivo real]:** una notificación marcada como "en curso" (`ongoing`) puede ser descartable por el usuario en versiones recientes de Android (14+) cuando no pertenece a un servicio en primer plano. El comportamiento exacto depende de la versión y del fabricante.

Enfoque en capas (probar en este orden y detenerse en el primero que funcione bien en el celular del usuario):
1. **Opción 1:** `@capacitor/local-notifications` con `ongoing: true` y `autoCancel: false`. Probarlo primero con un spike (Fase 1).
2. **Opción 2 (si la 1 no alcanza): plugin nativo propio en Kotlin** dentro de `android/`:
   - Publica la notificación con `NotificationCompat` (ongoing, `setOnlyAlertOnce`, canal `pinned`).
   - Registra un `deleteIntent` hacia un `BroadcastReceiver` que **vuelve a publicar** la notificación si la tarea sigue anclada.
   - Un `BroadcastReceiver` de arranque (`BOOT_COMPLETED`) vuelve a publicar las ancladas tras reiniciar.
   - Guarda la lista de ancladas en `SharedPreferences` (el JS la actualiza con un método `syncPinned(list)`), de modo que funcione aunque la app esté cerrada.
   - El `PendingIntent` de toque abre la app con el `taskId`.
3. **Opción 3 (último recurso): servicio en primer plano** (foreground service). Es la única forma realmente no descartable, pero implica un servicio permanente, más consumo de batería y requisitos de tipo de servicio en Android 14. Solo si las anteriores fallan, y consultándolo con el usuario.

Reglas funcionales del anclado:
- Se puede anclar cualquier tarea no completada; varias a la vez (cada una es su propia notificación).
- Desanclar solo desde la app (detalle de la tarea, o lista de ancladas en Configuración → Diagnóstico si es útil).
- Completar o eliminar una tarea la desancla automáticamente.
- Si se desancla en el celular, el estado `is_pinned` se sincroniza (el desktop solo lo muestra como indicador).

### 9.7 Recordatorios personalizados — UX **[NATIVO]**
- Desde el detalle de la tarea → "Recordatorios" → "Agregar recordatorio".
- Un recordatorio tiene: **mensaje opcional** y **una o varias fechas y horas** (selector que permite agregar varias; ej. 3 días distintos).
- Una tarea puede tener **varios recordatorios**.
- Se listan con sus próximas fechas; se pueden editar o borrar.
- Cuando se dispara una fecha, desaparece de la lista (se borra de la base); al agotarse todas, el recordatorio desaparece.
- No permitir fechas en el pasado.

---

## 10. Adjuntos: links y archivos

### 10.1 Links (Fase 5)
- Agregar uno o varios links por tarea (URL + etiqueta opcional). Se muestran en el detalle; tocar abre el navegador (en Android, fuera del WebView; usar `@capacitor/browser` o `App.openUrl` según corresponda **[VERIFICAR]**).

### 10.2 Archivos y fotos (Fase 9 — después de que el núcleo funcione)
- Selección: archivos (PDF, imágenes, otros) y **foto desde la cámara** (Android: `@capacitor/camera`, selector de archivos de Capacitor o `<input type="file">`; **[VERIFICAR]** la opción más estable).
- **Compresión de imágenes** en el cliente antes de subir (ancho máximo ~1600 px, calidad ~0.8). Límite de **10 MB** por archivo (S4); informar si se supera.
- **Flujo offline:** al adjuntar, el archivo se guarda localmente y el adjunto queda `pending`; se **sube cuando hay conexión** (cola con reintentos). El adjunto muestra un indicador de estado (pendiente / subiendo / listo / error con "Reintentar").
- **Lectura:** al abrir, descargar desde Storage (URL firmada de corta duración) y **cachear localmente** para verlo después sin conexión.
- Vista previa: imágenes en miniatura; otros archivos con ícono y nombre.
- **Limpieza:** al borrar tarea/adjunto (o por retención), eliminar el objeto de Storage (8.4).
- **[VERIFICAR]** si PowerSync ofrece utilidades de adjuntos para el SDK elegido; en caso contrario, implementarlo con la cola propia descrita.
- Considerar el límite de almacenamiento del plan gratuito de Supabase y mostrar el espacio usado en Configuración (opcional).

---

## 11. Diseño UX/UI

### 11.1 Principios
1. **Mobile-first y a una mano:** acciones principales al alcance del pulgar.
2. **Pocos elementos en pantalla.** Lo opcional aparece solo cuando se pide.
3. **El color informa, no decora.** La interfaz es neutra; el color se reserva para estados y para lo que el usuario elige.
4. **Rápido:** crear una tarea no debe tomar más de unos segundos; navegar entre carpetas, un toque.
5. Consistencia y feedback inmediato (la base local responde al instante; no hay "cargando" para datos locales).

### 11.2 Navegación (mobile)
- **Barra inferior** con 4 secciones: **Carpetas**, **Hoy**, **Buscar**, **Ajustes**.
- **Encabezado** de carpeta: ruta clickeable (breadcrumb, abreviada si es larga: `… › Cliente X › Proyecto`), botón volver, menú de la carpeta (Renombrar, Color, Mover, Eliminar) e indicador de sincronización discreto.
- **Botón flotante (+):** en una carpeta crea una **tarea**; en la raíz crea una **carpeta**. Las subcarpetas se crean con "+ Subcarpeta" en el encabezado de su sección.
- **Botón "atrás" de Android:** sube un nivel de carpeta, cierra paneles abiertos y, en la raíz, minimiza la app (usar el evento `backButton` de `@capacitor/app`).
- Rutas sugeridas: `/` (raíz de carpetas), `/f/:folderId`, `/task/:taskId` (detalle, abre como panel), `/today`, `/search`, `/settings`, `/login` (único paso de auth, email + código — sin `/reset-password`, no hay contraseña).

### 11.3 Listas y gestos
- Fila de tarea compacta (ver TSK-2). Altura táctil mínima de **48 px**.
- **Deslizar:** hacia un lado completa; hacia el otro elimina (con "Deshacer"). Evitar conflicto con el gesto de volver de Android (no iniciar el gesto en el borde de la pantalla).
- **Asa de arrastre** para reordenar (no depender del arrastre de toda la fila, para no chocar con el scroll). Además, "Subir/Bajar" en el menú.
- Menú contextual de tarea (⋯): Editar, Prioridad, Mover a…, Subir/Bajar, Anclar **[NATIVO]**, Recordatorio **[NATIVO]**, Eliminar.
- Sección "Completadas" colapsada por defecto, con contador.

### 11.4 Crear y editar
- **Panel inferior de creación** rápida (TSK-1): foco automático en el título, chips opcionales (📅 fecha, ★ prioridad, 🏷 etiquetas, 🎨 color), Enter para crear y seguir. **Cambiado (X51–X53):** ventana modal de crear/editar.
- **Detalle:** campos opcionales agrupados y ordenados; los vacíos se ven discretos ("Agregar fecha", "Agregar descripción") para no recargar.
- Selector de carpeta destino ("Mover a…") como árbol plegable con búsqueda.

### 11.5 Paleta

Base neutra + un acento. Definir como **variables CSS / tokens** y soportar `prefers-color-scheme`, con clase `dark` forzable desde Configuración.

| Uso | Claro | Oscuro |
|---|---|---|
| Fondo | `#F8FAFC` | `#0F172A` |
| Superficie (tarjetas, paneles) | `#FFFFFF` | `#1E293B` |
| Borde / separadores | `#E2E8F0` | `#334155` |
| Texto principal | `#0F172A` | `#F1F5F9` |
| Texto secundario | `#64748B` | `#94A3B8` |
| Acento (botones, selección) | `#4F46E5` | `#818CF8` |

Colores semánticos (solo para estados): **vencida** = rojo suave, **prioritaria** = ámbar, **completada** = verde.

**Colores elegibles por el usuario** (carpetas, tareas, etiquetas): paleta curada de **10 tokens**, sin selector libre. Guardar el nombre del token.

| Token | Claro | Oscuro |
|---|---|---|
| `slate` | `#64748B` | `#94A3B8` |
| `red` | `#EF4444` | `#F87171` |
| `orange` | `#F97316` | `#FB923C` |
| `amber` | `#F59E0B` | `#FBBF24` |
| `green` | `#22C55E` | `#4ADE80` |
| `teal` | `#14B8A6` | `#2DD4BF` |
| `blue` | `#3B82F6` | `#60A5FA` |
| `indigo` | `#6366F1` | `#818CF8` |
| `purple` | `#A855F7` | `#C084FC` |
| `pink` | `#EC4899` | `#F472B6` |

Uso del color: carpeta → punto/ícono de color; tarea → **franja fina** al costado (no fondo completo); etiqueta → chip con su color.

### 11.6 Buenas prácticas obligatorias
- Zonas táctiles ≥ 48 px; contraste **WCAG AA** en ambos temas (verificar los colores de chips y textos secundarios).
- Estados vacíos con guía clara en cada pantalla.
- Indicador sutil de **sin conexión / sincronizando**.
- Animaciones breves y sobrias; respetar `prefers-reduced-motion`.
- Etiquetas accesibles (`aria-*`), foco visible, navegación por teclado completa en desktop.
- Respetar áreas seguras (notch, barra de gestos) con `env(safe-area-inset-*)`.
- Teclado: que no tape el campo activo ni los botones del panel de creación.
- Confirmaciones solo para acciones destructivas de mayor impacto (borrar carpeta); para tareas, "Deshacer".

### 11.7 Desktop (≥ 768 px / ≥ 1024 px)
- ≥ 768 px: reemplazar la barra inferior por **barra lateral** con árbol de carpetas plegable (con conteos) y accesos a Hoy / Buscar / Ajustes.
- ≥ 1024 px: tres columnas — árbol, lista de tareas y **panel de detalle** a la derecha. **Cambiado (X51):** sin tercera columna; el detalle se abre en una ventana modal.
- Atajos de teclado: `N` nueva tarea, `/` o `Ctrl+K` buscar, `Esc` cerrar panel, `Enter` crear/confirmar. Mostrarlos en una ayuda discreta.
- Arrastrar y soltar con mouse, y menú contextual con clic derecho opcional.

---

## 12. PWA y versión desktop

- **`vite-plugin-pwa`:** manifest (nombre, íconos 192/512 y *maskable*, `display: standalone`, colores de tema), service worker con **precaché del shell de la app** para que cargue sin conexión. Estrategia de actualización con **aviso al usuario** ("Hay una nueva versión, actualizar") en lugar de recargar solos.
- **[VERIFICAR]** configuración de Vite requerida por el SDK de sincronización (web workers, WASM, cabeceras) y compatibilidad con el service worker.
- **En Capacitor (Android) NO registrar el service worker:** los assets van empaquetados en la app. Desactivarlo cuando `Capacitor.isNativePlatform()`.
- La PWA es la **versión desktop** (instalable desde Chrome/Edge). Funciona offline para ver y modificar (base local) y sincroniza al volver la conexión.
- Despliegue de la web: hosting estático con HTTPS (Vercel, Netlify o Cloudflare Pages). Definir con el usuario.
- **Futuro Tauri:** mantener fuera de la UI cualquier dependencia directa de APIs del navegador o de Capacitor; todo vía `src/platform/`.

---

## 13. Seguridad y privacidad

- **RLS activada en todas las tablas** con política `owner_id = auth.uid()` (5.3) y política equivalente en Storage (5.4).
- **Desactivar los registros públicos** (signups) en Supabase Auth tras crear la cuenta del usuario. Crear el usuario desde el panel.
- En el cliente solo se usa la **anon key**. La `service_role` nunca va en el cliente ni en el repositorio; solo en la Edge Function (variables de entorno del servidor).
- Variables de entorno en `.env.local` (fuera de git) + `.env.example` documentado.
- **Login passwordless (OTP) — medidas específicas:**
  - **Rate limiting:** configurar en Supabase Auth (Settings → Auth → Rate Limits) los límites de envío de emails de OTP, para evitar abuso/spam de códigos.
  - **Expiración corta del código:** bajar el OTP expiry de Supabase (ej. 5-10 minutos) en vez del default, para reducir la ventana de ataque si el correo es interceptado.
  - **Protección anti-bot:** habilitar Captcha (hCaptcha o Cloudflare Turnstile, soportado nativamente por Supabase Auth) en el formulario de pedido de código, para evitar enumeración de emails y flood de envíos.
  - **Intentos de verificación limitados:** Supabase invalida el OTP tras varios intentos fallidos; no implementar reintentos ilimitados en el cliente.
  - **Solo OTP numérico, nunca magic link** (`type: 'email'`), para no depender de que el usuario abra el enlace desde el mismo dispositivo/navegador.
  - **Persistencia sin fecha de vencimiento:** `persistSession` + `autoRefreshToken` en el cliente de Supabase; storage adapter por plataforma (AUTH-5 en 7.1) para que la sesión sobreviva reinicios del dispositivo/navegador sin volver a pedir el código.
- No registrar (log) contenido de tareas, tokens ni códigos OTP.
- Limpiar datos locales y notificaciones al cerrar sesión.
- Respaldos: el plan gratuito de Supabase puede no incluir copias de seguridad automáticas; por eso la **exportación JSON** es un requisito de la v1. Recomendar al usuario exportar periódicamente.
- Android: firma del APK con keystore propio guardado de forma segura (fuera del repositorio); distribución por instalación directa (sideload).

---

## 14. Plan de desarrollo por fases

> Al terminar cada fase: ejecutar lint + typecheck + tests, probar en navegador (viewport mobile y desktop), resumir y **esperar confirmación**. Cada fase indica **Tareas**, **Criterios de aceptación** y **No hacer todavía**.

### Fase 0 — Fundamentos del proyecto
**Tareas**
- Crear proyecto con Vite + React + TypeScript (modo estricto). Configurar ESLint, Prettier, Vitest, alias de importación.
- Instalar Tailwind y componentes base (shadcn/ui), íconos, router, Zustand, `date-fns`, `zod`, `react-hook-form`, `sonner`.
- Crear estructura de carpetas (sección 4), `src/i18n/es.ts`, `APP_NAME`, tokens de color (11.5) con tema claro/oscuro (modo "sistema").
- Crear `CLAUDE.md` (anexo 18) y `docs/DECISIONS.md`, `docs/SETUP.md`.
- Layouts base: mobile (barra inferior + FAB) y desktop (barra lateral), con pantallas vacías.
- `.env.example` y documentación de variables.

**Criterios de aceptación:** la app corre, navega entre las 4 secciones, respeta tema del sistema, pasa lint/typecheck/tests.
**No hacer todavía:** datos, auth, sync, PWA, Capacitor.

### Fase 1 — Backend, autenticación y spikes de riesgo
**Tareas**
- Proyecto de Supabase: migraciones de la sección 5 (tablas, triggers, RLS, trigger de ciclos, trigger de settings, bucket y política de Storage).
- Auth: pantalla única de login con email + código OTP (`signInWithOtp` / `verifyOtp`), sesión persistente sin expiración (storage adapter por plataforma, sección 13), cierre de sesión, rutas protegidas. Desactivar signups públicos (documentar el paso). Configurar rate limits, expiración corta del OTP y Captcha en el panel de Supabase.
- **Spike A (sincronización):** prueba mínima de PowerSync (o decisión por el Camino B) con una tabla de ejemplo: crear offline, sincronizar, ver en otro navegador. Registrar conclusiones y límites en `docs/DECISIONS.md`.
- **Spike B (anclado en Android):** app Capacitor mínima + un botón que publique una notificación `ongoing` y otra programada a 1 minuto. **Probar en el celular real** (anotar versión de Android) si la notificación se puede deslizar. Decidir Opción 1/2/3 de 9.6. Probar también permisos y alarmas exactas.

**Criterios de aceptación:** login funciona y persiste; cerrar y volver a abrir la app (incluso tras reiniciar el dispositivo) no vuelve a pedir el código mientras no se haya hecho logout; RLS verificada (un usuario no ve datos de otro); spikes documentados con la decisión tomada; **el usuario confirma** el resultado del spike de anclado en su dispositivo.
**No hacer todavía:** UI de carpetas/tareas.

### Fase 2 — Capa de datos local-first y sincronización
**Tareas**
- Esquema local, conector y repositorios (`FolderRepo`, `TaskRepo`, `TagRepo`, `AttachmentRepo`, `ReminderRepo`, `SettingsRepo`) con interfaz independiente de la tecnología.
- Utilidades puras con tests: árbol de carpetas, claves de orden (`fractional-indexing`), validación de ciclos, orden de visualización con prioridad (6.2), cálculo de avisos (6.6), retención (6.4), exportación.
- Indicador de estado de sincronización (7.9) y "Sincronizar ahora".
- Pantalla técnica temporal para crear/listar datos y probar la sincronización entre dos navegadores y en modo avión.

**Criterios de aceptación:** los cambios offline persisten y se sincronizan al volver la conexión; lo hecho en un dispositivo aparece en el otro; los tests de lógica pura pasan.
**No hacer todavía:** pantallas finales.

### Fase 3 — Carpetas
**Tareas:** requisitos FOL-1 a FOL-8: lista de carpetas, creación/edición/borrado con "Deshacer", color, mover (selector de árbol con exclusión de descendientes), reordenar (arrastrar + botones), navegación con breadcrumb, conteos recursivos, estados vacíos, botón atrás.
**Criterios de aceptación:** se pueden crear carpetas anidadas a cualquier profundidad, moverlas y reordenarlas; el borrado de una carpeta con contenido pide confirmación y se puede deshacer restaurando todo; funciona offline.
**No hacer todavía:** tareas.

### Fase 4 — Tareas (núcleo)
**Tareas:** TSK-1 a TSK-9 sin etiquetas ni adjuntos: panel de creación rápida (Enter crea y sigue), lista con indicadores, detalle con título/descripción/fecha/prioridad/color, completar, eliminar con "Deshacer", prioridad con orden de visualización (6.2), reordenar (arrastrar + botones), mover entre carpetas, sección Completadas con "Se borra en N días", limpieza al abrir la app.
**Criterios de aceptación:** solo el título es obligatorio; prioridad sube y al desmarcar vuelve a su lugar original; completadas bajan al final y se pueden desmarcar; todo funciona offline y sincroniza.

### Fase 5 — Etiquetas, vistas globales, búsqueda y links
**Tareas:** etiquetas con color (TAG-1 a TAG-3), vista **Hoy / Próximas** (7.5), filtro **Solo prioritarias**, **búsqueda global** sin tildes (7.6), **links** en tareas (10.1).
**Criterios de aceptación:** la vista Hoy agrupa correctamente (Vencidas, Hoy, Mañana, Esta semana, Más adelante) con ruta de carpeta; la búsqueda encuentra por título, descripción y etiqueta, ignorando mayúsculas y tildes; todo offline.

### Fase 6 — Configuración, respaldo y limpieza programada
**Tareas:** pantalla de Configuración (7.7): tema, retención, administración de etiquetas, cuenta, sincronización, acerca de; **exportar JSON** (7.8); Edge Function `cleanup` programada (8.4) con pruebas; ajustes de avisos de vencimiento (guardar la configuración, aunque las notificaciones se activen en la Fase 8).
**Criterios de aceptación:** el respaldo exporta datos válidos y versionados; el cambio de retención se refleja en "Se borra en N días"; la limpieza diaria borra lo vencido sin tocar lo demás.

### Fase 7 — PWA y versión desktop
**Tareas:** `vite-plugin-pwa` (manifest, íconos, precaché, aviso de actualización), layout desktop de tres columnas (11.7), atajos de teclado, pruebas de instalación en Chrome/Edge y de uso offline, despliegue de la web con HTTPS.
**Criterios de aceptación:** la PWA se instala, abre sin conexión, permite ver y modificar offline y sincroniza; el layout desktop funciona correctamente.

### Fase 8 — Capacitor Android y notificaciones
**Tareas**
- Integrar Capacitor (Android): `capacitor.config.ts`, `appId`, íconos y splash, deshabilitar service worker en nativo, manejo del botón atrás, deep link a `/task/:id`.
- `NotificationService` Capacitor: canales, permisos (notificaciones, alarmas exactas), `reconcile()` (9.4) con `notif_registry`.
- **Avisos automáticos** de vencimiento configurables (6.6, SET-3).
- **Recordatorios personalizados** con varias fechas y limpieza al dispararse (9.7).
- **Tareas ancladas** según la opción decidida en el Spike B (9.6), incluyendo reposición tras descarte/reinicio si corresponde.
- **Diagnóstico de notificaciones** en Configuración (SET-6) con notificación de prueba y guía de batería.
- Exportar JSON en Android con `saveAndShare`.

**Criterios de aceptación (probar en el celular real):** los avisos llegan a la hora configurada **sin conexión y con la app cerrada**; un recordatorio con varias fechas dispara cada una y se limpia; una tarea anclada se mantiene visible y solo se quita desde la app (según lo validado en el spike); tras reiniciar el celular, avisos y ancladas se restablecen; editar una tarea o cambiar la configuración reprograma correctamente.

### Fase 9 — Archivos y fotos adjuntos
**Tareas:** flujo de la sección 10.2 completo: selección/cámara, compresión, subida con cola y reintentos, estado por adjunto, caché local para ver offline, descarga bajo demanda, limpieza de Storage al borrar.
**Criterios de aceptación:** adjuntar offline y verificar que se sube al reconectar; ver un archivo ya descargado sin conexión; borrar la tarea elimina el archivo del Storage; se respeta el límite de tamaño.

### Fase 10 — Pulido, accesibilidad y entrega
**Tareas:** revisión de UX en celular real (gestos, teclado, áreas seguras), contraste y accesibilidad, rendimiento (listas largas, árbol grande), manejo de errores y estados vacíos, textos finales, íconos y nombre definitivo, firma y generación del **APK de release**, documentación final en `docs/SETUP.md` (cómo desplegar la web, compilar el APK, configurar Supabase/PowerSync, restaurar desde cero).
**Criterios de aceptación:** checklist de calidad (sección 15) completa y APK instalable en el celular del usuario.

---

## 15. Testing y criterios de calidad

### 15.1 Tests automáticos
- **Unitarios (Vitest):** árbol de carpetas y validación de ciclos; claves de orden (insertar entre, al inicio, al final, mover); orden de visualización con prioridad (que no altere `position`); cálculo de avisos de vencimiento (offsets, hora, solo futuros); retención; agrupación de la vista Hoy; normalización de búsqueda (tildes/mayúsculas); exportación JSON.
- **Componentes:** panel de creación (Enter crea y mantiene abierto), selector de carpeta destino (excluye descendientes), "Deshacer".
- **E2E (Playwright):** flujo completo en web, incluyendo **modo sin conexión** (`context.setOffline`): crear/editar/borrar offline y comprobar sincronización al reconectar.

### 15.2 Pruebas manuales obligatorias en Android
Lista a ejecutar en el celular real antes de dar por terminada la Fase 8:
- Aviso de vencimiento con app cerrada y sin internet.
- Recordatorio con varias fechas.
- Tarea anclada: intentar deslizarla/descartarla; desanclar desde la app; completar tarea anclada.
- Reinicio del celular.
- Cambio de hora de aviso y de fecha de una tarea.
- Permiso de notificaciones denegado y alarmas exactas sin conceder (la app debe explicar y guiar).
- Modo ahorro de batería.

### 15.3 Definición de "hecho" para cualquier tarea
- Compila sin errores ni advertencias relevantes; lint y typecheck limpios.
- Tests relevantes agregados y en verde.
- Funciona **offline** y se ve bien en 360 px de ancho y en desktop.
- Accesible (foco, etiquetas, contraste).
- Sin dependencias de red para leer/escribir datos de la UI.
- Textos en `es.ts`.

---

## 16. Mejoras futuras (fuera de la v1)

- **Archivo/historial consultable** de tareas completadas (opción en Configuración en lugar de borrarlas) — *mencionado por el usuario*.
- **Compartir carpetas o tareas** con otras personas (tabla `folder_members`, RLS ampliada).
- Notificaciones push para sincronizar con la app cerrada (FCM, mensajes silenciosos).
- Captura rápida (botón o "compartir hacia la app").
- Subtareas, tareas recurrentes, estados intermedios.
- Importar respaldo JSON.
- Pantalla de papelera.
- Aviso de vencimiento personalizado por tarea.
- Widget de pantalla de inicio en Android.
- Migrar desktop a **Tauri** (la capa `platform/` ya lo prepara).
- Descarga de archivos adjuntos dentro del respaldo.

---

## 17. Riesgos y puntos a verificar

| Riesgo / duda | Mitigación |
|---|---|
| Notificación "fija" descartable en Android 14+ | Spike B temprano en el celular real; plan por capas (9.6) |
| Alarmas/notificaciones eliminadas por ahorro de batería del fabricante | Diagnóstico en Configuración + guía de exclusión de batería |
| Complejidad de la sincronización offline | Spike A; interfaz de repositorios que permite cambiar de PowerSync a sincronización propia |
| SDK de PowerSync para Capacitor y límites del plan gratuito | **[VERIFICAR]** en documentación vigente antes de la Fase 2; usar SDK web en WebView si hace falta |
| Archivos adjuntos offline y almacenamiento limitado | Fase aparte (9), compresión, límite de 10 MB, cola con reintentos |
| Límite de cantidad de alarmas de Android | Ventana de programación de ~60 días y máx. ~200 pendientes con reconciliación |
| Pérdida de datos (sin backups automáticos en plan gratuito) | Exportación JSON en v1 y recomendación de respaldos periódicos |
| Conflictos entre dispositivos | "Último cambio gana" por campo; uso de un solo usuario |
| Gestos de deslizar vs. gesto de volver de Android | No iniciar gestos en el borde; probar en dispositivo real |
| Cambios en planes/limites de Supabase | **[VERIFICAR]** al iniciar el proyecto |

---

## 18. Anexo: CLAUDE.md sugerido y prompts de arranque

### 18.1 Contenido sugerido para `CLAUDE.md` (colocar en la raíz del repo)

```markdown
# Mis Tareas — instrucciones para Claude Code

Fuente de verdad: `TODO_APP_SPEC.md` (copiarlo a `docs/`). Leerlo antes de empezar y consultarlo ante dudas.

## Reglas
- Trabajar UNA fase por vez (sección 14). Al terminar: lint + typecheck + tests, resumen, y esperar confirmación.
- Offline-first: la UI solo lee/escribe en la base local mediante `src/data/repositories`. Nunca depender de la red para mostrar o editar datos.
- Lo específico de plataforma (notificaciones, anclado, archivos, compartir) va SOLO en `src/platform/*` detrás de interfaces.
- Solo el título de la tarea es obligatorio. No agregar campos obligatorios.
- Textos de interfaz en `src/i18n/es.ts` (español rioplatense). Sin textos hardcodeados.
- Colores: usar tokens (`slate, red, orange, amber, green, teal, blue, indigo, purple, pink`), nunca hex en componentes.
- Verificar documentación vigente de cada librería/servicio antes de usarla ([VERIFICAR] en el spec). No inventar APIs.
- Ante ambigüedad real, preguntar. Decisiones nuevas → `docs/DECISIONS.md`.
- Commits pequeños (Conventional Commits). Nunca commitear secretos (`.env.local`, keystore).
- Lógica pura en `src/lib/` con tests unitarios.

## Comandos (completar en la Fase 0)
- `npm run dev` · `npm run build` · `npm run lint` · `npm run typecheck` · `npm test`
```

### 18.2 Prompt de arranque (primera sesión)

```
Leé TODO_APP_SPEC.md completo. Resumime en pocas líneas lo que entendiste del proyecto y listá las dudas
o puntos [VERIFICAR] que tengas antes de empezar. No escribas código todavía.
Después, esperá mi confirmación para comenzar la Fase 0.
```

### 18.3 Prompt para cada fase

```
Trabajemos la Fase N del TODO_APP_SPEC.md. Hacé solo lo que dice esa fase (sin adelantar nada de las siguientes).
Verificá la documentación vigente de lo que uses. Al final corré lint, typecheck y tests, mostrame un resumen
de lo hecho, lo pendiente y cómo probarlo, y esperá mi confirmación.
```

### 18.4 Checklist rápido de inicio para el usuario
- [ ] Crear proyecto en Supabase y pasar URL + anon key a Claude Code (en `.env.local`).
- [ ] Decidir hosting de la web (Vercel / Netlify / Cloudflare Pages).
- [ ] Indicar modelo y **versión de Android** del celular.
- [ ] Definir nombre definitivo de la app y `appId`.
- [ ] Tener instalado Android Studio y un cable USB (o depuración inalámbrica) para probar en el celular real.
- [ ] Revisar los supuestos S1–S10 (sección 2.2) y cambiar los que no le convengan.
