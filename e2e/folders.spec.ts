import {
  chooseMenuItem,
  createFolder,
  createTask,
  dialog,
  es,
  expect,
  expectNoHorizontalScroll,
  folderLink,
  openApp,
  taskCheckbox,
  test,
  undoButton,
} from './fixtures';

// Carpetas (Fase 3): anidadas, breadcrumb y borrado con confirmación y "Deshacer".

test.beforeEach(async ({ page }) => {
  await openApp(page);
});

test('carpetas y subcarpetas con breadcrumb', async ({ page }) => {
  await createFolder(page, 'Universidad');
  await createFolder(page, 'Clientes');
  await expectNoHorizontalScroll(page);

  await folderLink(page, 'Clientes').click();
  await expect(page.getByText(es.folders.emptyTitle)).toBeVisible();
  await createFolder(page, 'Proyecto Ñandú', { sub: true });
  await folderLink(page, 'Proyecto Ñandú').click();

  const breadcrumb = page.getByRole('navigation', { name: es.folders.breadcrumb });
  await expect(breadcrumb.getByText('Proyecto Ñandú')).toHaveAttribute('aria-current', 'page');
  await breadcrumb.getByRole('link', { name: 'Clientes' }).click();
  await expect(breadcrumb.getByText('Clientes')).toHaveAttribute('aria-current', 'page');
  await expect(folderLink(page, 'Proyecto Ñandú')).toBeVisible();

  await page.getByRole('button', { name: es.common.back }).click();
  await expect(page.getByRole('heading', { name: es.nav.folders })).toBeVisible();
  await expect(folderLink(page, 'Universidad')).toBeVisible();
});

test('eliminar una carpeta con contenido pide confirmación y "Deshacer" restaura todo', async ({
  page,
}) => {
  await createFolder(page, 'Trabajo');
  await folderLink(page, 'Trabajo').click();
  await createTask(page, 'Revisar contrato');
  await createFolder(page, 'Proyectos', { sub: true });

  await page.locator('header').getByRole('button', { name: es.folders.folderMenu }).click();
  await chooseMenuItem(page, es.folders.folderMenu, es.folders.delete);
  const confirm = dialog(page, es.folders.deleteTitle('Trabajo'));
  await expect(confirm.getByText(es.folders.deleteDescription(1, 1))).toBeVisible();
  await confirm.getByRole('button', { name: es.common.delete }).click();

  // Vuelve a la raíz sin la carpeta y con el aviso para deshacer.
  await expect(page.getByRole('heading', { name: es.nav.folders })).toBeVisible();
  await expect(page.getByText(es.folders.deleted)).toBeVisible();
  await expect(folderLink(page, 'Trabajo')).toHaveCount(0);

  await undoButton(page).click();
  await folderLink(page, 'Trabajo').click();
  await expect(taskCheckbox(page, 'Revisar contrato')).toBeVisible();
  await expect(folderLink(page, 'Proyectos')).toBeVisible();
});
