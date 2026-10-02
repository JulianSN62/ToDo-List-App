import { createFolder, es, expect, FAKE_USER, folderLink, openApp, test } from './fixtures';

// Acceso: login sin sesión, sesión guardada y cierre de sesión (spec 7.1 y 8.3).

test.describe('sin sesión', () => {
  test.use({ signedIn: false });

  test('redirige al login y valida el email', async ({ page }) => {
    await page.goto('/');
    await page.waitForURL('**/login');
    const sendCode = page.getByRole('button', { name: es.auth.sendCode });
    await expect(sendCode).toBeDisabled();
    await page.getByLabel(es.auth.emailLabel).fill('vos@email.com');
    await expect(sendCode).toBeEnabled();
  });
});

test('con la sesión guardada abre la app sin pedir el código', async ({ page }) => {
  await openApp(page);
  await expect(page.getByText(es.folders.rootEmptyTitle)).toBeVisible();
});

test('cerrar sesión borra la sesión y los datos locales', async ({ page }) => {
  await openApp(page);
  await createFolder(page, 'Carpeta que se borra');

  await page.getByRole('link', { name: es.nav.settings }).click();
  await expect(page.getByText(FAKE_USER.email)).toBeVisible();
  await page.getByRole('button', { name: es.settings.signOut }).click();
  await page
    .getByRole('dialog', { name: es.settings.signOutTitle })
    .getByRole('button', { name: es.settings.signOut })
    .click();
  await page.waitForURL('**/login', { timeout: 20_000 });

  const stored = await page.evaluate(() => [
    localStorage.getItem('todo.auth'),
    localStorage.getItem('todo.knownUser'),
  ]);
  expect(stored).toEqual([null, null]);

  // Al volver a entrar con la misma cuenta, la base local arranca vacía.
  await openApp(page);
  await expect(page.getByText(es.folders.rootEmptyTitle)).toBeVisible();
  await expect(folderLink(page, 'Carpeta que se borra')).toHaveCount(0);
});
