import {
  chooseMenuItem,
  createFolder,
  createTask,
  dialog,
  es,
  expect,
  folderLink,
  openApp,
  openNewTask,
  pendingTitles,
  taskButton,
  taskCheckbox,
  taskRow,
  test,
  undoButton,
} from './fixtures';

// Tareas (Fase 4): ventana de crear y editar, prioridad, completar, eliminar y mover.

test.beforeEach(async ({ page }) => {
  await openApp(page);
  await createFolder(page, 'Universidad');
  await folderLink(page, 'Universidad').click();
  await expect(page.getByText(es.folders.emptyTitle)).toBeVisible();
});

test('crear con todos los campos, "Crear y agregar otra" y Enter', async ({ page }) => {
  const form = await openNewTask(page);
  const title = form.getByRole('textbox', { name: es.tasks.titleLabel });
  await title.fill('Entregar TP');
  await form.getByRole('textbox', { name: es.tasks.descriptionLabel }).fill('Capítulos 1 a 3');
  await form.getByRole('button', { name: es.tasks.dateShortcuts.tomorrow }).click();
  await form.getByRole('switch', { name: es.tasks.priority }).click();
  await form.getByRole('radio', { name: es.colors.names.indigo }).click();
  await form.getByRole('button', { name: es.tasks.createAndAddAnother }).click();

  // La ventana queda abierta, vacía y conserva la prioridad.
  await expect(page.getByText(es.tasks.created)).toBeVisible();
  await expect(title).toHaveValue('');
  await expect(form.getByRole('switch', { name: es.tasks.priority })).toBeChecked();

  // Enter en el título crea y cierra.
  await title.fill('Leer apunte');
  await title.press('Enter');
  await expect(form).toBeHidden();
  await expect(taskCheckbox(page, 'Entregar TP')).toBeVisible();
  await expect(taskCheckbox(page, 'Leer apunte')).toBeVisible();
});

test('el título es obligatorio', async ({ page }) => {
  const form = await openNewTask(page);
  await form.getByRole('button', { name: es.common.create, exact: true }).click();
  await expect(form.getByText(es.tasks.titleRequired)).toBeVisible();
  await form.getByRole('button', { name: es.tasks.closeForm }).click();
  await expect(form).toBeHidden();
});

test('la prioritaria sube y al quitarle la prioridad vuelve a su lugar', async ({ page }) => {
  for (const title of ['Primera', 'Segunda', 'Tercera']) await createTask(page, title);
  expect(await pendingTitles(page)).toEqual(['Primera', 'Segunda', 'Tercera']);

  await taskRow(page, 'Tercera')
    .getByRole('button', { name: es.tasks.menu('Tercera') })
    .click();
  await chooseMenuItem(page, es.tasks.menu('Tercera'), es.tasks.markPriority);
  await expect.poll(() => pendingTitles(page)).toEqual(['Tercera', 'Primera', 'Segunda']);

  await taskRow(page, 'Tercera')
    .getByRole('button', { name: es.tasks.menu('Tercera') })
    .click();
  await chooseMenuItem(page, es.tasks.menu('Tercera'), es.tasks.unmarkPriority);
  await expect.poll(() => pendingTitles(page)).toEqual(['Primera', 'Segunda', 'Tercera']);
});

test('completar, desmarcar y eliminar con "Deshacer"', async ({ page }) => {
  await createTask(page, 'Estudiar para el parcial');
  await createTask(page, 'Leer apunte');

  await taskCheckbox(page, 'Estudiar para el parcial').click();
  await page.getByRole('button', { name: es.tasks.completedSection(1) }).click();
  // Sin configuración descargada se usa la retención por defecto (7 días).
  await expect(page.getByText(es.tasks.deletesIn(7))).toBeVisible();
  await page
    .getByRole('checkbox', { name: es.tasks.markUndone('Estudiar para el parcial') })
    .click();
  await expect(taskCheckbox(page, 'Estudiar para el parcial')).toBeVisible();

  await taskRow(page, 'Leer apunte')
    .getByRole('button', { name: es.tasks.menu('Leer apunte') })
    .click();
  await chooseMenuItem(page, es.tasks.menu('Leer apunte'), es.common.delete);
  await expect(page.getByText(es.tasks.deleted)).toBeVisible();
  await expect(taskCheckbox(page, 'Leer apunte')).toHaveCount(0);
  await undoButton(page).click();
  await expect(taskCheckbox(page, 'Leer apunte')).toBeVisible();
});

test('detalles desplegables, editar con confirmación al descartar y mover de carpeta', async ({
  page,
}) => {
  await createTask(page, 'Entregar TP', { description: 'Capítulos 1 a 3' });
  await createTask(page, 'Revisar contrato');

  // Se pueden desplegar varias filas a la vez.
  await page.getByRole('button', { name: es.tasks.showDetails('Entregar TP') }).click();
  await page.getByRole('button', { name: es.tasks.showDetails('Revisar contrato') }).click();
  await expect(page.getByText('Capítulos 1 a 3')).toBeVisible();
  await expect(page.getByText(es.tasks.noDetails)).toBeVisible();

  await taskButton(page, 'Entregar TP').click();
  const form = dialog(page, es.tasks.editTask);
  await expect(form.getByRole('textbox', { name: es.tasks.titleLabel })).toHaveValue('Entregar TP');
  await form.getByRole('textbox', { name: es.tasks.descriptionLabel }).fill('Capítulos 1 a 4');
  await form.getByRole('button', { name: es.tasks.closeForm }).click();
  const discard = dialog(page, es.tasks.discardTitle);
  await discard.getByRole('button', { name: es.common.cancel }).click();
  await expect(discard).toBeHidden();
  await form.getByRole('button', { name: es.common.save }).click();
  await expect(form).toBeHidden();
  await expect(page.getByText('Capítulos 1 a 4')).toBeVisible();

  // Mover a otra carpeta desde la ventana de edición.
  await page.getByRole('button', { name: es.common.back }).click();
  await createFolder(page, 'Personal');
  await folderLink(page, 'Universidad').click();
  await taskButton(page, 'Revisar contrato').click();
  await form.getByRole('button', { name: es.tasks.changeFolder }).click();
  const picker = dialog(page, es.tasks.chooseFolder);
  await picker.getByRole('treeitem', { name: /Personal/ }).click();
  await picker.getByRole('button', { name: es.tasks.choose, exact: true }).click();
  await expect(picker).toBeHidden();
  await form.getByRole('button', { name: es.common.save }).click();
  await expect(form).toBeHidden();
  await expect(taskCheckbox(page, 'Revisar contrato')).toHaveCount(0);
  await page.getByRole('button', { name: es.common.back }).click();
  await folderLink(page, 'Personal').click();
  await expect(taskCheckbox(page, 'Revisar contrato')).toBeVisible();
});
