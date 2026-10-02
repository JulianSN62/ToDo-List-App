import { test as base, expect, type Locator, type Page } from '@playwright/test';
import { es } from '../src/i18n/es';

// Base común de los tests E2E: sesión ficticia, red externa bloqueada y control de la consola.

export { es, expect };

export const FAKE_USER = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'prueba@example.com',
};

// Sesión con vencimiento en el futuro: con una vencida, supabase-js intenta renovarla
// sin parar y la app queda en blanco.
function fakeSession() {
  const expiresIn = 24 * 60 * 60;
  return {
    access_token: 'e2e.fake.token',
    token_type: 'bearer',
    expires_in: expiresIn,
    expires_at: Math.floor(Date.now() / 1000) + expiresIn,
    refresh_token: 'e2e-fake-refresh',
    user: {
      id: FAKE_USER.id,
      email: FAKE_USER.email,
      aud: 'authenticated',
      role: 'authenticated',
      app_metadata: {},
      user_metadata: {},
      created_at: new Date().toISOString(),
    },
  };
}

// Errores esperables sin red: la sincronización falla y las peticiones externas se cortan.
const EXPECTED_CONSOLE_ERRORS = [
  /powersync: Sync error/i,
  /net::ERR_/,
  /Failed to fetch/i,
  /NetworkError/i,
  /WebSocket/i,
];

interface Fixtures {
  /** false: el test arranca sin sesión guardada. */
  signedIn: boolean;
  /** Errores de consola inesperados (el test falla si queda alguno). */
  consoleErrors: string[];
}

export const test = base.extend<Fixtures>({
  signedIn: [true, { option: true }],

  context: async ({ context, signedIn }, use) => {
    // Solo se habla con el preview local.
    await context.route(
      (url) => url.hostname !== 'localhost' && url.hostname !== '127.0.0.1',
      (route) => route.abort(),
    );
    if (signedIn) {
      // Se guarda la sesión solo si no hay una (así cerrar sesión no la repone en la
      // misma navegación).
      await context.addInitScript(
        ([session, user]) => {
          if (!localStorage.getItem('todo.auth')) {
            localStorage.setItem('todo.auth', JSON.stringify(session));
            localStorage.setItem('todo.knownUser', JSON.stringify(user));
          }
        },
        [fakeSession(), FAKE_USER] as const,
      );
    }
    await use(context);
  },

  consoleErrors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on('console', (message) => {
        const text = message.text();
        const isError = message.type() === 'error' || /Content Security Policy/i.test(text);
        if (isError && !EXPECTED_CONSOLE_ERRORS.some((pattern) => pattern.test(text))) {
          errors.push(text);
        }
      });
      page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
      await use(errors);
      expect(errors, 'errores inesperados en la consola').toEqual([]);
    },
    { auto: true },
  ],
});

/** true desde 768px (barra lateral, atajos y botones con texto). */
export function isDesktop(page: Page): boolean {
  return (page.viewportSize()?.width ?? 0) >= 768;
}

/** Fecha local YYYY-MM-DD, con días de diferencia respecto de hoy. */
export function localDate(offsetDays = 0): string {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Abre la app con la sesión guardada y espera la pantalla de Carpetas. */
export async function openApp(page: Page, path = '/'): Promise<void> {
  await page.goto(path);
  if (path === '/') {
    await expect(page.getByRole('heading', { name: es.nav.folders })).toBeVisible({
      timeout: 30_000,
    });
  }
}

export function dialog(page: Page, name: string): Locator {
  return page.getByRole('dialog', { name });
}

/** Crea una carpeta en la pantalla actual (raíz o, con sub, como subcarpeta). */
export async function createFolder(
  page: Page,
  name: string,
  { sub = false }: { sub?: boolean } = {},
): Promise<void> {
  if (sub) {
    await page.getByRole('button', { name: es.folders.addSubfolderLabel }).click();
  } else if (isDesktop(page)) {
    await page.getByRole('button', { name: es.folders.newFolder }).first().click();
  } else {
    await page.getByRole('button', { name: es.folders.createFolderFab }).click();
  }
  const form = dialog(page, sub ? es.folders.newSubfolder : es.folders.newFolder);
  await form.getByRole('textbox', { name: es.folders.nameLabel }).fill(name);
  await form.getByRole('button', { name: es.common.create, exact: true }).click();
  await expect(form).toBeHidden();
  await expect(folderLink(page, name)).toBeVisible();
}

export function folderLink(page: Page, name: string): Locator {
  return page.getByRole('link', { name: new RegExp(escapeRegExp(name)) }).first();
}

/** Abre la ventana "Nueva tarea" de la carpeta actual. */
export async function openNewTask(page: Page): Promise<Locator> {
  await page
    .getByRole('button', { name: isDesktop(page) ? es.tasks.newTask : es.folders.createTaskFab })
    .click();
  const form = dialog(page, es.tasks.newTask);
  await expect(form).toBeVisible();
  return form;
}

interface NewTaskOptions {
  dueDate?: string;
  priority?: boolean;
  description?: string;
}

/** Crea una tarea en la carpeta actual con la ventana "Nueva tarea". */
export async function createTask(
  page: Page,
  title: string,
  { dueDate, priority, description }: NewTaskOptions = {},
): Promise<void> {
  const form = await openNewTask(page);
  await form.getByRole('textbox', { name: es.tasks.titleLabel }).fill(title);
  if (description) {
    await form.getByRole('textbox', { name: es.tasks.descriptionLabel }).fill(description);
  }
  if (dueDate) await form.getByLabel(es.tasks.dueDate, { exact: true }).fill(dueDate);
  if (priority) await form.getByRole('switch', { name: es.tasks.priority }).click();
  await form.getByRole('button', { name: es.common.create, exact: true }).click();
  await expect(form).toBeHidden();
  await expect(taskCheckbox(page, title)).toBeVisible();
}

export function taskCheckbox(page: Page | Locator, title: string): Locator {
  return page.getByRole('checkbox', { name: es.tasks.markDone(title) });
}

/** Fila completa de una tarea pendiente (para usar su menú "⋯"). */
export function taskRow(page: Page, title: string): Locator {
  return page.getByRole('listitem').filter({ has: taskCheckbox(page, title) });
}

/** Títulos de las tareas pendientes visibles, en el orden en que se muestran. */
export async function pendingTitles(page: Page | Locator): Promise<string[]> {
  const [prefix = '', suffix = ''] = es.tasks.markDone('\u0000').split('\u0000');
  const pattern = new RegExp(`^${escapeRegExp(prefix)}(.*)${escapeRegExp(suffix)}$`);
  const labels = await page
    .getByRole('checkbox', { name: pattern })
    .evaluateAll((elements) => elements.map((element) => element.getAttribute('aria-label')));
  return labels.map((label) => pattern.exec(label ?? '')?.[1] ?? '');
}

/** Botón de la fila de una tarea (abre la ventana de edición). */
export function taskButton(page: Page | Locator, title: string): Locator {
  return page.getByRole('button', { name: new RegExp(escapeRegExp(title)) }).first();
}

/** Elige una opción de un menú "⋯": dropdown en desktop, panel inferior en mobile. */
export async function chooseMenuItem(page: Page, menuLabel: string, item: string): Promise<void> {
  if (isDesktop(page)) {
    await page.getByRole('menuitem', { name: item, exact: true }).click();
  } else {
    await dialog(page, menuLabel).getByRole('button', { name: item, exact: true }).click();
  }
}

/** Botón "Deshacer" del aviso más reciente. */
export function undoButton(page: Page): Locator {
  return page
    .locator('[data-sonner-toast][data-front="true"]')
    .getByRole('button', { name: es.common.undo });
}

export async function expectNoHorizontalScroll(page: Page): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(overflow, 'hay scroll horizontal').toBe(false);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
