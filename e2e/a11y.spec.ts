import { AxeBuilder } from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import {
  createFolder,
  createTask,
  dialog,
  es,
  expect,
  folderLink,
  isDesktop,
  localDate,
  openApp,
  openNewTask,
  taskRow,
  test,
} from './fixtures';

// Accesibilidad (spec 11.6 y Fase 10): axe revisa las pantallas principales en tema claro y
// oscuro (contraste WCAG AA, nombres accesibles, roles y estructura). Además se prueba el foco
// al cerrar ventanas y que tocar un aviso no cierre la ventana abierta.

async function expectNoSeriousViolations(page: Page, screen: string): Promise<void> {
  // Los avisos son pasajeros y se apilan con transparencia: sus colores son los mismos
  // tokens que el resto (texto principal y acento sobre la superficie).
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .exclude('[data-sonner-toaster]')
    .analyze();
  const serious = results.violations
    .filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')
    .map(
      (violation) =>
        `${violation.id}: ${violation.nodes
          .slice(0, 3)
          .map((node) => node.target.join(' '))
          .join(' | ')}`,
    );
  // Los menores se informan en la salida, sin hacer fallar el test.
  const minor = results.violations
    .filter((violation) => violation.impact !== 'serious' && violation.impact !== 'critical')
    .map((violation) => `${violation.id} (${violation.impact ?? '?'})`);
  if (minor.length > 0) console.log(`[axe] ${screen}: ${minor.join(', ')}`);
  expect(serious, `problemas de accesibilidad en ${screen}`).toEqual([]);
}

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`axe, tema ${colorScheme === 'light' ? 'claro' : 'oscuro'}`, () => {
    // Sin animaciones: axe mide los colores ya visibles (no a mitad de un fundido).
    test.use({ colorScheme, reducedMotion: 'reduce' });

    test('pantallas principales sin problemas graves', async ({ page }) => {
      test.setTimeout(90_000);
      await openApp(page);
      await createFolder(page, 'Universidad');
      await expectNoSeriousViolations(page, 'Carpetas');

      await folderLink(page, 'Universidad').click();
      await createTask(page, 'Entregar el TP', { dueDate: localDate(-1), priority: true });
      await createTask(page, 'Leer apunte', { dueDate: localDate(1), description: 'Cap. 2' });
      await createTask(page, 'Ya hecha');
      await page.getByRole('checkbox', { name: es.tasks.markDone('Ya hecha') }).click();
      await page.getByRole('button', { name: es.tasks.completedSection(1) }).click();
      await page.getByRole('button', { name: es.tasks.showDetails('Leer apunte') }).click();
      await expectNoSeriousViolations(page, 'una carpeta con tareas');

      const form = await openNewTask(page);
      await expectNoSeriousViolations(page, 'la ventana de nueva tarea');
      await form.getByRole('button', { name: es.reminders.add }).click();
      const reminder = dialog(page, es.reminders.newReminder);
      await expect(reminder).toBeVisible();
      await expectNoSeriousViolations(page, 'la ventana de un recordatorio');
      await reminder.getByRole('button', { name: es.common.cancel }).click();
      await expect(reminder).toBeHidden();
      await form.getByRole('button', { name: es.tasks.closeForm }).click();
      await expect(form).toBeHidden();

      await taskRow(page, 'Leer apunte')
        .getByRole('button', { name: es.tasks.menu('Leer apunte') })
        .click();
      await expectNoSeriousViolations(page, 'el menú de una tarea');
      await page.keyboard.press('Escape');

      await page.getByRole('link', { name: es.nav.today }).click();
      await expect(page.getByRole('heading', { name: es.today.title })).toBeVisible();
      await expectNoSeriousViolations(page, 'Hoy');

      await page.getByRole('link', { name: es.nav.search }).click();
      await page.getByRole('searchbox', { name: es.search.placeholder }).fill('apunte');
      await expect(
        page.getByRole('checkbox', { name: es.tasks.markDone('Leer apunte') }),
      ).toBeVisible();
      await expectNoSeriousViolations(page, 'Buscar');

      await page.getByRole('link', { name: es.nav.settings }).click();
      await expect(page.getByRole('heading', { name: es.settings.title })).toBeVisible();
      await expectNoSeriousViolations(page, 'Ajustes');

      await page.getByRole('button', { name: new RegExp(es.dueAlerts.title) }).click();
      await expect(page.getByRole('heading', { name: es.dueAlerts.title })).toBeVisible();
      await expectNoSeriousViolations(page, 'Alertas de vencimiento');
    });
  });
}

test.describe('sin sesión', () => {
  test.use({ signedIn: false });

  test('el login no tiene problemas graves', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: es.auth.title })).toBeAttached();
    await expectNoSeriousViolations(page, 'el login');
  });
});

test('cada pantalla tiene su título en la pestaña', async ({ page }) => {
  await openApp(page);
  await expect(page).toHaveTitle(`${es.nav.folders} · ToDo List`);
  await createFolder(page, 'Universidad');
  await folderLink(page, 'Universidad').click();
  await expect(page).toHaveTitle('Universidad · ToDo List');
  await page.getByRole('link', { name: es.nav.today }).click();
  await expect(page).toHaveTitle(`${es.today.title} · ToDo List`);
});

test('al cerrar una ventana el foco vuelve al botón que la abrió', async ({ page }) => {
  await openApp(page);
  await createFolder(page, 'Universidad');
  await folderLink(page, 'Universidad').click();

  const opener = page.getByRole('button', {
    name: isDesktop(page) ? es.tasks.newTask : es.folders.createTaskFab,
  });
  await opener.focus();
  await page.keyboard.press('Enter');
  const form = dialog(page, es.tasks.newTask);
  await expect(form).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(form).toBeHidden();
  await expect(opener).toBeFocused();
});

test('"Saltar al contenido" lleva el foco al contenido principal', async ({ page }) => {
  await openApp(page);
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: es.nav.skipToContent });
  await expect(skip).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('main')).toBeFocused();
});

test('tocar un aviso no cierra la ventana abierta', async ({ page }) => {
  await openApp(page);
  await createFolder(page, 'Universidad');
  await folderLink(page, 'Universidad').click();
  const form = await openNewTask(page);
  await form.getByRole('textbox', { name: es.tasks.titleLabel }).fill('Primera');
  await form.getByRole('button', { name: es.tasks.createAndAddAnother }).click();
  const toast = page.locator('[data-sonner-toast]').filter({ hasText: es.tasks.created });
  await expect(toast).toBeVisible();
  if (isDesktop(page)) await toast.click();
  else await toast.tap();
  await expect(form).toBeVisible();
});
