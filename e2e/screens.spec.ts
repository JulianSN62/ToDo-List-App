import type { Page, TestInfo } from '@playwright/test';
import sharp from 'sharp';
import {
  createFolder,
  createTask,
  es,
  expect,
  expectNoHorizontalScroll,
  folderLink,
  localDate,
  openApp,
  openNewTask,
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

      // Ventana con archivos: miniatura, PDF, uno que supera el límite y el estado.
      const form = await openNewTask(page);
      await form
        .getByRole('textbox', { name: es.tasks.titleLabel })
        .fill('Presentar documentación');
      const chooser = page.waitForEvent('filechooser');
      await form.getByRole('button', { name: es.files.addLabel }).click();
      const photo = await sharp({
        create: { width: 640, height: 480, channels: 3, background: { r: 60, g: 140, b: 90 } },
      })
        .jpeg()
        .toBuffer();
      await (
        await chooser
      ).setFiles([
        { name: 'frente del DNI.jpg', mimeType: 'image/jpeg', buffer: photo },
        {
          name: 'constancia de domicilio.pdf',
          mimeType: 'application/pdf',
          buffer: Buffer.from('%PDF-1.4'),
        },
        { name: 'video.mp4', mimeType: 'video/mp4', buffer: Buffer.alloc(11 * 1024 * 1024) },
      ]);
      await expect(form.getByRole('alert')).toBeVisible();
      // La ventana tiene su propio scroll: se muestra la sección de adjuntos.
      await form.getByRole('button', { name: es.files.addLabel }).scrollIntoViewIfNeeded();
      await capture(page, testInfo, 'ventana-archivos');
      await form.getByRole('button', { name: es.common.create, exact: true }).click();
      await expect(form).toBeHidden();
      await page
        .getByRole('button', { name: es.tasks.showDetails('Presentar documentación') })
        .click();
      await expect(
        page.getByRole('button', { name: es.files.open('frente del DNI.jpg') }).locator('img'),
      ).toBeVisible();
      await capture(page, testInfo, 'tareas-archivos');

      await page.getByRole('link', { name: es.nav.today }).click();
      await expect(page.getByRole('heading', { name: es.today.title })).toBeVisible();
      await capture(page, testInfo, 'hoy');

      await page.getByRole('link', { name: es.nav.search }).click();
      await page.getByRole('searchbox', { name: es.search.placeholder }).fill('apunte');
      await capture(page, testInfo, 'buscar');

      await page.getByRole('link', { name: es.nav.settings }).click();
      await expect(page.getByRole('heading', { name: es.settings.title })).toBeVisible();
      await capture(page, testInfo, 'ajustes');
      await page.getByRole('heading', { name: es.files.storage.title }).scrollIntoViewIfNeeded();
      await capture(page, testInfo, 'ajustes-datos');

      await page.getByRole('button', { name: new RegExp(es.dueAlerts.title) }).click();
      await expect(page.getByRole('heading', { name: es.dueAlerts.title })).toBeVisible();
      await capture(page, testInfo, 'alertas');
    });
  });
}
