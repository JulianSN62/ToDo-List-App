import type { Locator, Page } from '@playwright/test';
import {
  createFolder,
  createTask,
  dialog,
  es,
  expect,
  folderLink,
  localDate,
  openApp,
  openNewTask,
  pendingTitles,
  taskButton,
  taskCheckbox,
  test,
} from './fixtures';

// Fase 5: etiquetas, links, filtros, vista Hoy / Próximas, búsqueda y Ajustes → Etiquetas.

/** En la ventana de tarea: crea (o marca) una etiqueta desde el selector. */
async function addTag(page: Page, form: Locator, name: string): Promise<void> {
  await form
    .getByRole('button', { name: new RegExp(`${es.tags.addTag}|${es.tags.editTags}`) })
    .click();
  const picker = dialog(page, es.tags.title);
  const search = picker.getByRole('searchbox');
  await search.fill(name);
  await search.press('Enter');
  await expect(picker.getByRole('checkbox', { name })).toBeChecked();
  await picker.getByRole('button', { name: es.common.done }).click();
  await expect(picker).toBeHidden();
}

/** Crea una tarea con una etiqueta (y opcionalmente fecha, prioridad o descripción). */
async function createTaggedTask(
  page: Page,
  title: string,
  tag: string,
  { priority = false, description }: { priority?: boolean; description?: string } = {},
): Promise<void> {
  const form = await openNewTask(page);
  await form.getByRole('textbox', { name: es.tasks.titleLabel }).fill(title);
  if (description) {
    await form.getByRole('textbox', { name: es.tasks.descriptionLabel }).fill(description);
  }
  if (priority) await form.getByRole('switch', { name: es.tasks.priority }).click();
  await addTag(page, form, tag);
  await form.getByRole('button', { name: es.common.create, exact: true }).click();
  await expect(form).toBeHidden();
}

test.beforeEach(async ({ page }) => {
  await openApp(page);
});

test('etiquetas y links en la ventana de tarea', async ({ page }) => {
  await createFolder(page, 'Clientes');
  await folderLink(page, 'Clientes').click();

  const form = await openNewTask(page);
  await form.getByRole('textbox', { name: es.tasks.titleLabel }).fill('Revisar contrato');
  await addTag(page, form, 'Urgente');
  await form.getByRole('button', { name: es.links.addLabel }).click();
  await form.getByRole('textbox', { name: es.links.urlLabel }).fill('ejemplo.com/contrato');
  await form.getByRole('textbox', { name: es.links.labelLabel }).fill('Contrato');
  await form.getByRole('button', { name: es.links.save }).click();
  const link = form.getByRole('link', { name: es.links.open('Contrato') });
  // Sin protocolo se antepone https://
  await expect(link).toHaveAttribute('href', 'https://ejemplo.com/contrato');

  // "Crear y agregar otra" conserva las etiquetas y vacía los links.
  await form.getByRole('button', { name: es.tasks.createAndAddAnother }).click();
  await expect(form.getByText('Urgente')).toBeVisible();
  await expect(link).toHaveCount(0);
  await form.getByRole('textbox', { name: es.tasks.titleLabel }).fill('Enviar factura');
  await form.getByRole('button', { name: es.common.create, exact: true }).click();
  await expect(form).toBeHidden();

  // La fila muestra los indicadores y los detalles, el link.
  // Hay un indicador para mobile y otro para desktop: se mira el que está a la vista.
  await expect(
    page.getByText(es.links.count(1), { exact: true }).filter({ visible: true }),
  ).toHaveCount(1);
  await expect(
    page.getByText(es.tags.listLabel('Urgente'), { exact: true }).filter({ visible: true }).first(),
  ).toBeVisible();
  await page.getByRole('button', { name: es.tasks.showDetails('Revisar contrato') }).click();
  const popupPromise = page.waitForEvent('popup');
  await page.getByRole('link', { name: es.links.open('Contrato') }).click();
  const popup = await popupPromise;
  await popup.close();
  await expect(taskCheckbox(page, 'Revisar contrato')).toBeVisible();

  // Un link inválido no se guarda.
  await taskButton(page, 'Enviar factura').click();
  const edit = dialog(page, es.tasks.editTask);
  await edit.getByRole('button', { name: es.links.addLabel }).click();
  await edit.getByRole('textbox', { name: es.links.urlLabel }).fill('javascript:alert(1)');
  await edit.getByRole('button', { name: es.links.save }).click();
  await expect(edit.getByRole('alert').filter({ hasText: es.links.invalidUrl })).toBeVisible();
});

test('filtros "Solo prioritarias" y por etiqueta en la raíz', async ({ page }) => {
  await createFolder(page, 'Clientes');
  await folderLink(page, 'Clientes').click();
  await createTaggedTask(page, 'Revisar contrato', 'Urgente', { priority: true });
  await createTask(page, 'Pagar hosting');
  await createFolder(page, 'Proyecto Ñandú', { sub: true });
  await folderLink(page, 'Proyecto Ñandú').click();
  await createTaggedTask(page, 'Diseñar logo', 'Diseño', { priority: true });

  await page.getByRole('link', { name: es.nav.folders }).click();
  await page.getByRole('button', { name: es.filters.priorityOnly }).click();
  await expect(page.getByText(es.filters.scopeRoot)).toBeVisible();
  await expect
    .poll(() => pendingTitles(page))
    .toEqual(expect.arrayContaining(['Revisar contrato', 'Diseñar logo']));
  expect(await pendingTitles(page)).not.toContain('Pagar hosting');
  await expect(page.getByText('Clientes › Proyecto Ñandú').first()).toBeVisible();

  await page.getByRole('button', { name: es.tags.filterTitle }).click();
  await dialog(page, es.tags.filterTitle).getByRole('option', { name: 'Diseño' }).click();
  await expect.poll(() => pendingTitles(page)).toEqual(['Diseñar logo']);

  await page.getByRole('button', { name: es.filters.clear }).first().click();
  await expect(folderLink(page, 'Clientes')).toBeVisible();
});

test('Hoy / Próximas agrupa por fecha y abre la tarea en su carpeta', async ({ page }) => {
  await createFolder(page, 'Trabajo');
  await folderLink(page, 'Trabajo').click();
  await createTask(page, 'Pagar hosting', { dueDate: localDate(-3) });
  await createTask(page, 'Revisar contrato', { dueDate: localDate(0), priority: true });
  await createTask(page, 'Enviar factura', { dueDate: localDate(1) });
  await createTask(page, 'Preparar demo', { dueDate: localDate(20) });
  await createTask(page, 'Sin fecha');

  await page.getByRole('link', { name: es.nav.today }).click();
  await expect(page.getByRole('heading', { name: es.today.title })).toBeVisible();
  const { groups } = es.today;
  for (const label of [groups.overdue, groups.today, groups.tomorrow, groups.later]) {
    await expect(page.getByRole('button', { name: es.today.groupHeader(label, 1) })).toBeVisible();
  }
  expect(await pendingTitles(page)).not.toContain('Sin fecha');

  await page.getByRole('button', { name: es.filters.priorityOnly }).click();
  await expect(
    page.getByRole('button', { name: es.today.groupHeader(groups.today, 1) }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: es.today.groupHeader(groups.overdue, 1) }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: es.filters.priorityOnly }).click();

  await taskButton(page, 'Pagar hosting').click();
  const edit = dialog(page, es.tasks.editTask);
  await expect(edit.getByRole('textbox', { name: es.tasks.titleLabel })).toHaveValue(
    'Pagar hosting',
  );
  await edit.getByRole('button', { name: es.tasks.goToFolder }).click();
  await page.waitForURL(/\/f\//);
  await expect(taskCheckbox(page, 'Pagar hosting')).toBeVisible();
});

test('búsqueda sin mayúsculas ni tildes, por descripción, etiqueta y completadas', async ({
  page,
}) => {
  await createFolder(page, 'Clientes');
  await folderLink(page, 'Clientes').click();
  await createTaggedTask(page, 'Diseñar logo', 'Diseño', { description: 'Paleta de colores' });
  await createTaggedTask(page, 'Revisar contrato', 'Urgente');
  await createTask(page, 'Llamar a Martín', { description: 'Preguntar por la cláusula' });
  await taskCheckbox(page, 'Llamar a Martín').click();
  await expect(page.getByRole('button', { name: es.tasks.completedSection(1) })).toBeVisible();

  await page.getByRole('link', { name: es.nav.search }).click();
  const box = page.getByRole('searchbox', { name: es.search.placeholder });
  await expect(page.getByText(es.search.hintTitle)).toBeVisible();
  const result = (title: string) => taskButton(page, title);

  await box.fill('DISENAR');
  await expect(result('Diseñar logo')).toBeVisible();
  await box.fill('paleta');
  await expect(result('Diseñar logo')).toBeVisible();
  await box.fill('urgente');
  await expect(result('Revisar contrato')).toBeVisible();
  await box.fill('clausula');
  await expect(result('Llamar a Martín')).toBeVisible();
  await box.fill('zzz');
  await expect(page.getByText(es.search.noResults('zzz'))).toBeVisible();
  await page.getByRole('button', { name: es.search.clear }).click();
  await expect(page.getByText(es.search.hintTitle)).toBeVisible();

  await page.getByRole('button', { name: es.tags.filterTitle }).click();
  await dialog(page, es.tags.filterTitle).getByRole('option', { name: 'Urgente' }).click();
  await expect(result('Revisar contrato')).toBeVisible();
  await expect(result('Diseñar logo')).toHaveCount(0);
});

test('Ajustes → Etiquetas: renombrar, cambiar color y eliminar', async ({ page }) => {
  await createFolder(page, 'Clientes');
  await folderLink(page, 'Clientes').click();
  await createTaggedTask(page, 'Revisar contrato', 'Urgente');
  await createTaggedTask(page, 'Diseñar logo', 'Diseño');

  await page.getByRole('link', { name: es.nav.settings }).click();
  await page.getByRole('button', { name: new RegExp(es.settings.tags) }).click();
  await expect(page.getByRole('heading', { name: es.tags.title })).toBeVisible();

  await page.getByRole('button', { name: /^Urgente/ }).click();
  const edit = dialog(page, es.tags.editTag);
  const name = edit.getByRole('textbox', { name: es.tags.nameLabel });
  await name.fill('diseño');
  await edit.getByRole('button', { name: es.common.save }).click();
  await expect(edit.getByRole('alert').filter({ hasText: es.tags.nameTaken })).toBeVisible();
  await name.fill('Muy urgente');
  await edit.getByRole('radio', { name: es.colors.names.purple }).click();
  await edit.getByRole('button', { name: es.common.save }).click();
  await expect(page.getByText('Muy urgente')).toBeVisible();

  await page.getByRole('button', { name: es.tags.menu('Diseño') }).click();
  if ((page.viewportSize()?.width ?? 0) >= 768) {
    await page.getByRole('menuitem', { name: es.tags.delete }).click();
  } else {
    await dialog(page, es.tags.menu('Diseño'))
      .getByRole('button', { name: es.tags.delete })
      .click();
  }
  const confirm = dialog(page, es.tags.deleteTitle('Diseño'));
  await expect(confirm.getByText(es.tags.deleteDescription(1))).toBeVisible();
  await confirm.getByRole('button', { name: es.common.delete }).click();
  await expect(page.getByText('Diseño', { exact: true })).toHaveCount(0);

  // La etiqueta renombrada se busca con el nombre nuevo.
  await page.getByRole('link', { name: es.nav.search }).click();
  await page.getByRole('searchbox', { name: es.search.placeholder }).fill('muy urgente');
  await expect(taskButton(page, 'Revisar contrato')).toBeVisible();
});
