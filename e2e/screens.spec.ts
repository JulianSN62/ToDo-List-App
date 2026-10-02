import type { Page, TestInfo } from '@playwright/test';
import {
  createFolder,
  createTask,
  es,
  expect,
  expectNoHorizontalScroll,
  folderLink,
  localDate,
  openApp,
  test,
} from './fixtures';

// Pasada por las pantallas principales en tema claro y oscuro: el tema del sistema se
// respeta, no hay scroll horizontal y quedan capturas en test-results (y en el reporte) para
// revisarlas.

async function capture(page: Page, testInfo: TestInfo, name: string): Promise<void> {
  await expectNoHorizontalScroll(page);
  const path = testInfo.outputPath(`${name}.png`);
  await page.screenshot({ path, fullPage: true, animations: 'disabled' });
  await testInfo.attach(name, { path, contentType: 'image/png' });
}

/** Luminancia aproximada (0 a 1) del fondo de la página. */
async function backgroundLuminance(page: Page): Promise<number> {
  const color = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  const [r = 0, g = 0, b = 0] = (color.match(/\d+(\.\d+)?/g) ?? []).map(Number);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`tema ${colorScheme === 'light' ? 'claro' : 'oscuro'}`, () => {
    test.use({ colorScheme });

    test('pantallas principales', async ({ page }, testInfo) => {
      await openApp(page);
      const luminance = await backgroundLuminance(page);
      if (colorScheme === 'dark') expect(luminance).toBeLessThan(0.3);
      else expect(luminance).toBeGreaterThan(0.7);

      await createFolder(page, 'Universidad');
      await createFolder(page, 'Clientes con un nombre bastante largo para probar el recorte');
      await capture(page, testInfo, 'carpetas');

      await folderLink(page, 'Universidad').click();
      await createTask(page, 'Entregar el trabajo práctico de Programación Avanzada', {
        dueDate: localDate(-1),
        priority: true,
        description: 'Capítulos 1 a 3, con bibliografía',
      });
      await createTask(page, 'Leer apunte', { dueDate: localDate(1) });
      await page
        .getByRole('button', {
          name: es.tasks.showDetails('Entregar el trabajo práctico de Programación Avanzada'),
        })
        .click();
      await capture(page, testInfo, 'tareas');

      await page.getByRole('link', { name: es.nav.today }).click();
      await expect(page.getByRole('heading', { name: es.today.title })).toBeVisible();
      await capture(page, testInfo, 'hoy');

      await page.getByRole('link', { name: es.nav.search }).click();
      await page.getByRole('searchbox', { name: es.search.placeholder }).fill('apunte');
      await capture(page, testInfo, 'buscar');

      await page.getByRole('link', { name: es.nav.settings }).click();
      await expect(page.getByRole('heading', { name: es.settings.title })).toBeVisible();
      await capture(page, testInfo, 'ajustes');

      await page.getByRole('button', { name: new RegExp(es.dueAlerts.title) }).click();
      await expect(page.getByRole('heading', { name: es.dueAlerts.title })).toBeVisible();
      await capture(page, testInfo, 'alertas');
    });
  });
}
