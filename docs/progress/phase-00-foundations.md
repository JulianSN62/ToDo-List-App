# Fase 0 — Fundamentos del proyecto

**Estado:** ✅ Hecha (2026-10-01)

## Qué se hizo
- Proyecto Vite 8 + React 19 + TypeScript 6 (estricto, `noUncheckedIndexedAccess`), alias `@/` → `src/`.
- ESLint 10 (typescript-eslint, react-hooks 7 con reglas del React Compiler, react-refresh, `no-console`), Prettier con plugin de Tailwind, Vitest 5 + Testing Library (jsdom).
- Tailwind 4 sin paleta por defecto: utilidades propias sobre `src/styles/tokens.css` (copia literal de `design/tokens.css`). Tema Sistema/Claro/Oscuro por dispositivo (`src/app/theme.ts`).
- Fuente Inter empaquetada (offline). Íconos `lucide-react`, sin emojis.
- Estructura de la sección 4 del spec: `src/app`, `src/features/*`, `src/data`, `src/platform`, `src/lib`, `src/ui`, `src/i18n/es.ts`, `src/config`.
- Componentes base (patrón shadcn/ui): `Button`, `IconButton`, `Input`, `AutoTextarea`, `Switch`, `RadioGroup`, `Sheet` (bottom sheet en mobile / modal en desktop), `ActionMenu` (sheet de opciones en mobile / dropdown en desktop), `ConfirmDialog`, `ColorSwatchPicker`, `ColorDot`, `EmptyState`, `ScreenHeader`, `SortableList` + `DragHandle`, toasts (sonner) con "Deshacer".
- Layouts: `< 768px` barra inferior + FAB; `768–1023px` barra lateral colapsable con árbol de carpetas; `≥ 1024px` tres columnas (árbol · lista · detalle de 400px). Áreas seguras con `env(safe-area-inset-*)`.
- `CLAUDE.md`, `docs/DECISIONS.md`, `docs/SETUP.md`, `.env.example`, `.env`, `.gitignore`.

## Cómo probar
`npm run dev` → navegar entre Carpetas, Hoy, Buscar y Ajustes en 360px, 800px y 1280px de ancho; cambiar el tema en Ajustes.

## Pendiente / notas
- Atajos de teclado de desktop (`N`, `/`, `Ctrl+K`, `Esc`) → Fase 7.
