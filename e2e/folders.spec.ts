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

  await page
    .locator('header')
    .getByRole('button', { name: es.folders.folderMenu('Trabajo') })
    .click();
  await chooseMenuItem(page, es.folders.folderMenu('Trabajo'), es.folders.delete);
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

test('"Mover a…" es un árbol plegable que se usa con teclado', async ({ page }) => {
  await createFolder(page, 'Clientes');
  await createFolder(page, 'Archivo');
  await folderLink(page, 'Clientes').click();
  await createFolder(page, 'Cliente X', { sub: true });
  await page.getByRole('button', { name: es.common.back }).click();
  await expect(page.getByRole('heading', { name: es.nav.folders })).toBeVisible();

  await page
    .getByRole('main')
    .getByRole('button', { name: es.folders.folderMenu('Archivo') })
    .click();
  await chooseMenuItem(page, es.folders.folderMenu('Archivo'), es.folders.move);
  const picker = dialog(page, es.folders.moveTitle('Archivo'));
  const tree = picker.getByRole('tree');
  const clientes = tree.getByRole('treeitem', { name: /Clientes/ });
  const clienteX = tree.getByRole('treeitem', { name: /Cliente X/ });

  // Arranca plegado: la subcarpeta no se ve.
  await expect(clientes).toHaveAttribute('aria-expanded', 'false');
  await expect(clienteX).toHaveCount(0);

  // Flecha derecha despliega, abajo entra a la subcarpeta y Enter la elige.
  await clientes.focus();
  await page.keyboard.press('ArrowRight');
  await expect(clientes).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('ArrowDown');
  await expect(clienteX).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(clienteX).toHaveAttribute('aria-selected', 'true');
  await picker.getByRole('button', { name: es.common.move, exact: true }).click();
  await expect(picker).toBeHidden();

  await expect(page.getByRole('main').getByRole('link', { name: /Archivo/ })).toHaveCount(0);
  await folderLink(page, 'Clientes').click();
  await page
    .getByRole('main')
    .getByRole('link', { name: /Cliente X/ })
    .click();
  await expect(page.getByRole('main').getByRole('link', { name: /Archivo/ })).toBeVisible();
});
