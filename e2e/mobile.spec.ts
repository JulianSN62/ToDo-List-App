import { es, expect, openApp, test } from './fixtures';

// Solo mobile: sin atajos de teclado ni ayuda, y Buscar como pantalla (no ventana flotante).

test('sin atajos ni ícono de ayuda', async ({ page }) => {
  await openApp(page);
  await expect(page.getByRole('button', { name: es.shortcuts.title })).toHaveCount(0);
  await page.keyboard.press('n');
  await page.keyboard.press('/');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('Buscar es una pantalla', async ({ page }) => {
  await openApp(page);
  await page.getByRole('link', { name: es.nav.search }).click();
  await expect(page.getByRole('searchbox', { name: es.search.placeholder })).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('Ajustes, Hoy y Buscar tienen botón Volver', async ({ page }) => {
  await openApp(page);
  for (const name of [es.nav.settings, es.nav.today, es.nav.search]) {
    await page.getByRole('link', { name }).click();
    await page.getByRole('button', { name: es.common.back }).click();
    await expect(page.getByRole('heading', { name: es.nav.folders })).toBeVisible();
  }
});
