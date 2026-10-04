import type { Page } from '@playwright/test';
import {
  es,
  expect,
  isDesktop,
  openApp,
  pendingTitles,
  taskCheckbox,
  taskRow,
  test,
} from './fixtures';

// Listas largas (spec Fase 10, rendimiento): 1000 tareas en una carpeta y 300 carpetas.
// Los tiempos se anotan en la salida del test como referencia, sin umbrales.

const TASKS = 1000;
const FOLDERS = 300;

async function seed(page: Page): Promise<string> {
  const result = await page.evaluate(
    ({ tasks, folders }) =>
      (
        window as unknown as {
          __todoE2eSeed: (input: {
            tasks: number;
            folders: number;
          }) => Promise<{ bigFolderId: string }>;
        }
      ).__todoE2eSeed({ tasks, folders }),
    { tasks: TASKS, folders: FOLDERS },
  );
  return result.bigFolderId;
}

async function timed(label: string, action: () => Promise<void>): Promise<void> {
  const start = Date.now();
  await action();
  console.log(`[listas largas] ${label}: ${Date.now() - start} ms`);
}

interface Measure {
  /** Elemento a tocar: por aria-label exacto o por su texto. */
  click: { label?: string; text?: string };
  /** Cuándo termina: deja de existir ese aria-label, o el primero queda antes que el segundo. */
  until: { gone?: string; before?: [string, string] };
}

// Mide dentro de la página (sin el costo de los selectores de Playwright, que con 1000
// filas es alto) desde el clic hasta que la interfaz muestra el resultado.
async function measureInPage(page: Page, label: string, measure: Measure): Promise<void> {
  const ms = await page.evaluate(async ({ click, until }) => {
    const byLabel = (value: string) =>
      document.querySelector<HTMLElement>(`[aria-label=${JSON.stringify(value)}]`);
    const target = click.label
      ? byLabel(click.label)
      : Array.from(document.querySelectorAll<HTMLElement>('[role="menuitem"], button')).find(
          (element) => element.textContent?.trim() === click.text,
        );
    if (!target) throw new Error('No se encontró el elemento a tocar');
    const done = () => {
      if (until.gone) return byLabel(until.gone) === null;
      const [first, second] = until.before ?? ['', ''];
      const a = byLabel(first);
      const b = byLabel(second);
      return (
        a !== null &&
        b !== null &&
        (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0
      );
    };
    const start = performance.now();
    target.click();
    await new Promise<void>((resolve, reject) => {
      const check = () => {
        if (done()) resolve();
        else if (performance.now() - start > 20_000) reject(new Error('Tiempo agotado'));
        else requestAnimationFrame(check);
      };
      check();
    });
    return Math.round(performance.now() - start);
  }, measure);
  console.log(`[listas largas] ${label}: ${ms} ms (medido en la página)`);
}

test.beforeEach(async ({ page }) => {
  await openApp(page);
  await expect
    .poll(() => page.evaluate(() => '__todoE2eSeed' in window), { timeout: 10_000 })
    .toBe(true);
});

test('una carpeta con 1000 tareas se abre y se usa', async ({ page }) => {
  test.setTimeout(120_000);
  const folderId = await seed(page);

  await timed('abrir la carpeta', async () => {
    await page.goto(`/f/${folderId}`);
    await expect(taskCheckbox(page, `Tarea ${TASKS}`)).toBeAttached({ timeout: 30_000 });
  });
  // Las prioritarias (1 de cada 25) van arriba.
  const titles = await pendingTitles(page);
  expect(titles).toHaveLength(TASKS);
  expect(titles[0]).toBe('Tarea 1');
  expect(titles[1]).toBe('Tarea 26');

  await measureInPage(page, 'completar una tarea', {
    click: { label: es.tasks.markDone('Tarea 500') },
    until: { gone: es.tasks.markDone('Tarea 500') },
  });
  await expect(page.getByText(es.tasks.completedSection(1))).toBeVisible();

  // El menú se arma al abrirlo y sabe si la tarea puede subir o bajar.
  await taskRow(page, 'Tarea 3')
    .getByRole('button', { name: es.tasks.menu('Tarea 3') })
    .click();
  await expect(
    isDesktop(page)
      ? page.getByRole('menuitem', { name: es.common.moveUp, exact: true })
      : page.getByRole('dialog', { name: es.tasks.menu('Tarea 3') }).getByRole('button', {
          name: es.common.moveUp,
          exact: true,
        }),
  ).toBeEnabled();
  await measureInPage(page, 'subir una tarea', {
    click: { text: es.common.moveUp },
    until: { before: [es.tasks.markDone('Tarea 3'), es.tasks.markDone('Tarea 2')] },
  });

  await measureInPage(page, 'desplegar los detalles', {
    click: { label: es.tasks.showDetails('Tarea 999') },
    until: { gone: es.tasks.showDetails('Tarea 999') },
  });
  await expect(page.getByText(es.tasks.noDetails)).toBeVisible();
});

test('la búsqueda encuentra entre 1000 tareas', async ({ page }) => {
  test.setTimeout(120_000);
  await seed(page);
  await page.goto('/search');
  await timed('buscar', async () => {
    await page.getByRole('searchbox').fill('Tarea 777');
    await expect(
      page.getByRole('checkbox', { name: es.tasks.markDone('Tarea 777') }),
    ).toBeVisible();
  });
});

test('300 carpetas en el árbol', async ({ page }) => {
  test.setTimeout(120_000);
  await seed(page);
  await timed('mostrar las carpetas', async () => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: /Carpeta grande/ }).first()).toBeVisible({
      timeout: 30_000,
    });
  });
  if (isDesktop(page)) {
    // La barra lateral lista las de la raíz con su conteo de pendientes.
    await expect(
      page
        .getByRole('complementary', { name: es.nav.mainNavigation })
        .getByRole('link', { name: /Carpeta grande/ }),
    ).toBeVisible();
  }
});
