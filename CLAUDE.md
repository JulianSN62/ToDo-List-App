# ToDo List — instrucciones para Claude Code

Fuente de verdad: `docs/specs-and-design.md` (especificación) y `design/` (diseño, tokens y pantallas).
Leerlos antes de empezar una fase y consultarlos ante dudas.

## Reglas
- Trabajar por **bloques** acordados con el usuario (fases de la sección 14 del spec, agrupadas; el plan vigente está en `docs/progress/README.md`). Al terminar un bloque: lint + typecheck + tests + build + e2e, resumen, y esperar confirmación.
- **Prioridad actual:** web y PWA. El proyecto Android (Capacitor) debe seguir compilando (`npm run android:build`), pero no se prueba en el celular hasta nuevo aviso (X84).
- **Registro de avance obligatorio:** al terminar cada fase o funcionalidad, actualizar `docs/progress/README.md` (estado y próximo paso recomendado) y el archivo de la fase en `docs/progress/`.
- **Git:** remoto público en GitHub (`origin`, rama `main`). Un commit al cerrar cada bloque (con lint, typecheck, tests, build y e2e en verde y la documentación al día). **Push solo cuando el usuario lo pide**, y antes reescanear los archivos en busca de secretos (repositorio público). No agregar remotos. El autor está configurado solo en este repositorio; no tocar la configuración global de git.
- Offline-first: la UI solo lee/escribe en la base local mediante `src/data` (repositorios y hooks). Nunca importar PowerSync ni Supabase desde `src/features` o `src/ui`.
- Lo específico de plataforma (notificaciones, anclado, archivos, compartir, botón atrás) va SOLO en `src/platform/*` detrás de interfaces.
- Solo el título de la tarea es obligatorio. No agregar campos obligatorios.
- Textos de interfaz en `src/i18n/es.ts` (español rioplatense). Sin textos hardcodeados.
- Colores: solo tokens (`src/styles/tokens.css`, copia literal de `design/tokens.css`) a través de las utilidades de Tailwind (`bg-app`, `bg-panel`, `text-fg`, `text-muted`, `bg-brand`, `text-danger`, `user-*`...). Nunca hex en componentes.
- Código y nombres de archivo en inglés; comentarios (simples, sin emojis), textos y documentación en español.
- Seguridad: todo lo sensible va en `.env` (ignorado por git). Las variables `VITE_*` son públicas: nunca secret keys ni contraseñas (el build se cancela si detecta una). No loguear contenido de tareas, tokens, emails ni códigos OTP (usar `src/lib/logger.ts`).
- Los límites de texto de `src/lib/validation.ts` deben coincidir con los CHECK de la migración SQL.
- Cambios en la base: nueva migración en `supabase/migrations/` (nunca editar una ya aplicada) y, si hay tablas nuevas, actualizar `powersync/sync-config.yaml`, `src/data/schema.ts` y la publicación `powersync`.
- Verificar documentación vigente de cada librería/servicio antes de usarla. No inventar APIs.
- Ante ambigüedad real, preguntar. Decisiones nuevas → `docs/DECISIONS.md`.
- Lógica pura en `src/lib/` con tests unitarios.

## Comandos
- `npm run dev` — servidor de desarrollo (http://localhost:5173)
- `npm run build` — typecheck + build de producción (PWA incluida)
- `npm run preview` — sirve el build (probar PWA y modo offline)
- `npm run lint` · `npm run typecheck` · `npm test` (incluye las pruebas de las funciones SQL con PGlite)
- `npm run e2e` — tests E2E con Playwright y el Edge instalado (build propio en `dist-e2e/` con variables ficticias, sin `.env`)
- `npm run icons` — regenera íconos de PWA y Android desde `assets/`
- `npm run android:build` — build web + `cap sync` + APK debug (usa un JDK 21)
- `npm run android:open` — abre el proyecto en Android Studio
