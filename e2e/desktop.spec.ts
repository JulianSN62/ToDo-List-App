import type { Page } from '@playwright/test';
import {
  createFolder,
  createTask,
  dialog,
  es,
  expect,
  folderLink,
  openApp,
  taskButton,
  taskCheckbox,
  test,
  undoButton,
} from './fixtures';

// Solo desktop (Bloque 3): atajos de teclado, búsqueda flotante, ayuda y clic derecho.

/** Saca el foco de cualquier campo para que los atajos actúen. */
async function focusPage(page: Page): Promise<void> {
  await page.locator('body').click({ position: { x: 700, y: 400 } });
}

async function setUpFolderWithTasks(page: Page): Promise<void> {
  await createFolder(page, 'Trabajo');
  await folderLink(page, 'Trabajo').click();
  await createTask(page, 'Preparar informe anual');
  await createTask(page, 'Llamar al banco', { priority: true });
}

test.beforeEach(async ({ page }) => {
  await openApp(page);
});

test('N crea una carpeta en la raíz y una tarea dentro de una carpeta', async ({ page }) => {
  await focusPage(page);
  await page.keyboard.press('n');
  const folderForm = dialog(page, es.folders.newFolder);
  await folderForm.getByRole('textbox', { name: es.folders.nameLabel }).fill('Trabajo nuevo');
  await folderForm.getByRole('button', { name: es.common.create, exact: true }).click();
  await folderLink(page, 'Trabajo nuevo').click();
  await expect(page.getByText(es.folders.emptyTitle)).toBeVisible();

  await focusPage(page);
  await page.keyboard.press('n');
  const taskForm = dialog(page, es.tasks.newTask);
  const title = taskForm.getByRole('textbox', { name: es.tasks.titleLabel });
  // Mientras se escribe, la "n" va al título y no abre otra ventana.
  await title.pressSequentially('Nota nueva');
  await expect(title).toHaveValue('Nota nueva');
  await expect(page.getByRole('dialog')).toHaveCount(1);
  await title.press('Enter');
  await expect(taskCheckbox(page, 'Nota nueva')).toBeVisible();
});

test('clic derecho sobre una tarea abre su menú', async ({ page }) => {
  await setUpFolderWithTasks(page);
  await taskButton(page, 'Preparar informe anual').click({ button: 'right' });
  await page.getByRole('menu').getByRole('menuitem', { name: es.common.delete }).click();
  await expect(taskCheckbox(page, 'Preparar informe anual')).toHaveCount(0);
});

test('"/" abre la búsqueda flotante; Esc vuelve a los resultados y después la cierra', async ({
  page,
}) => {
  await setUpFolderWithTasks(page);
  await focusPage(page);
  await page.keyboard.press('/');
  const overlay = dialog(page, es.search.title);
  const box = overlay.getByRole('searchbox', { name: es.search.placeholder });
  await expect(box).toBeFocused();
  await box.pressSequentially('informe');
  await taskButton(overlay, 'Preparar informe anual').click();

  const edit = dialog(page, es.tasks.editTask);
  await expect(edit).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(edit).toBeHidden();
  await expect(taskButton(overlay, 'Preparar informe anual')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(overlay).toBeHidden();
});

test('Ctrl+K desde Hoy e "Ir a la carpeta" cierra la búsqueda', async ({ page }) => {
  await setUpFolderWithTasks(page);
  await page.getByRole('link', { name: es.nav.today }).click();
  await expect(page.getByRole('heading', { name: es.today.title })).toBeVisible();
  await page.keyboard.press('Control+k');
  const overlay = dialog(page, es.search.title);
  await overlay.getByRole('searchbox').fill('banco');
  await expect(taskButton(overlay, 'Llamar al banco')).toBeVisible();
  await overlay.getByRole('button', { name: es.tasks.menu }).first().click();
  await page.getByRole('menuitem', { name: es.tasks.goToFolder }).click();
  await expect(overlay).toBeHidden();
  await page.waitForURL(/\/f\//);
  await expect(taskCheckbox(page, 'Llamar al banco')).toBeVisible();
});

test('"Deshacer" funciona con la búsqueda flotante abierta', async ({ page }) => {
  await setUpFolderWithTasks(page);
  await page.keyboard.press('Control+k');
  const overlay = dialog(page, es.search.title);
  await overlay.getByRole('searchbox').fill('informe');
  await overlay.getByRole('button', { name: es.tasks.menu }).first().click();
  await page.getByRole('menuitem', { name: es.common.delete }).click();
  await expect(taskButton(overlay, 'Preparar informe anual')).toHaveCount(0);
  await undoButton(page).click();
  await expect(taskButton(overlay, 'Preparar informe anual')).toBeVisible();
  await expect(overlay).toBeVisible();
});

test('ayuda de atajos: con el globo abierto, N no actúa', async ({ page }) => {
  await page.getByRole('button', { name: es.shortcuts.title }).click();
  const help = dialog(page, es.shortcuts.title);
  await expect(help.getByText('Ctrl+K')).toBeVisible();
  await expect(help.getByText(es.shortcuts.close)).toBeVisible();
  await page.keyboard.press('n');
  await expect(dialog(page, es.folders.newFolder)).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(help).toBeHidden();
});

test('en la pantalla Buscar, "/" solo enfoca el campo', async ({ page }) => {
  await page.getByRole('link', { name: es.nav.search }).click();
  const box = page.getByRole('searchbox', { name: es.search.placeholder });
  await expect(box).toBeVisible();
  await page.locator('body').click({ position: { x: 1200, y: 700 } });
  await page.keyboard.press('/');
  await expect(box).toBeFocused();
  await expect(dialog(page, es.search.title)).toHaveCount(0);
});
