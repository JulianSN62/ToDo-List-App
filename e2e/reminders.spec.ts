import type { Locator, Page } from '@playwright/test';
import {
  chooseMenuItem,
  createFolder,
  createTask,
  dialog,
  es,
  expect,
  folderLink,
  localDate,
  openApp,
  openNewTask,
  taskButton,
  taskRow,
  test,
} from './fixtures';

// Recordatorios y tareas ancladas en la web (Bloque 7, X117): se crean y se editan igual que
// en Android, pero los avisos llegan en la app de Android. En la web no hay Diagnóstico.

test.beforeEach(async ({ page }) => {
  await openApp(page);
  await createFolder(page, 'Casa');
  await folderLink(page, 'Casa').click();
  await expect(page.getByText(es.folders.emptyTitle)).toBeVisible();
});

async function setTime(sheet: Locator, index: number, date: string, time: string) {
  await sheet.getByLabel(es.reminders.dateLabel(index), { exact: true }).fill(date);
  await sheet.getByLabel(es.reminders.timeLabel(index), { exact: true }).fill(time);
}

/** Indicador visible de la fila (en desktop los indicadores existen dos veces). */
function rowIndicator(page: Page, title: string, name: string): Locator {
  return taskRow(page, title).getByRole('img', { name }).filter({ visible: true });
}

test('crear una tarea anclada con un recordatorio de dos fechas y editarlo', async ({ page }) => {
  const form = await openNewTask(page);
  await form.getByRole('textbox', { name: es.tasks.titleLabel }).fill('Pagar la luz');
  await form.getByRole('button', { name: es.reminders.add }).click();

  const sheet = dialog(page, es.reminders.newReminder);
  await expect(sheet).toBeVisible();
  await sheet.getByLabel(es.reminders.messageLabel).fill('Antes del vencimiento');
  await setTime(sheet, 1, localDate(2), '09:00');
  await sheet.getByRole('button', { name: es.reminders.addTime }).click();
  await setTime(sheet, 2, localDate(3), '18:30');
  await sheet.getByRole('button', { name: es.reminders.done }).click();
  await expect(sheet).toBeHidden();

  await expect(form.getByText('Antes del vencimiento')).toBeVisible();
  await expect(form.getByText(es.reminders.androidNote)).toBeVisible();
  await form.getByRole('switch', { name: es.reminders.pin }).click();
  await form.getByRole('button', { name: es.common.create, exact: true }).click();
  await expect(form).toBeHidden();

  // La fila muestra el pin y la campana; los detalles, el recordatorio.
  await expect(rowIndicator(page, 'Pagar la luz', es.tasks.pinned)).toBeVisible();
  await expect(
    taskRow(page, 'Pagar la luz').getByText(es.reminders.indicator(1), { exact: true }).first(),
  ).toBeAttached();
  await page.getByRole('button', { name: es.tasks.showDetails('Pagar la luz') }).click();
  await expect(taskRow(page, 'Pagar la luz').getByText('Antes del vencimiento')).toBeVisible();

  // Editar: se quita una fecha y después el recordatorio entero.
  await taskButton(page, 'Pagar la luz').click();
  const edit = dialog(page, es.tasks.editTask);
  await edit.getByRole('button', { name: es.reminders.edit('Antes del vencimiento') }).click();
  const editSheet = dialog(page, es.reminders.editReminder);
  await expect(editSheet.getByLabel(es.reminders.dateLabel(2), { exact: true })).toHaveValue(
    localDate(3),
  );
  await editSheet.getByRole('button', { name: es.reminders.removeTime(2) }).click();
  await editSheet.getByRole('button', { name: es.reminders.done }).click();
  await expect(editSheet).toBeHidden();
  await edit.getByRole('button', { name: es.reminders.remove('Antes del vencimiento') }).click();
  await edit.getByRole('switch', { name: es.reminders.pin }).click();
  await edit.getByRole('button', { name: es.common.save }).click();
  await expect(edit).toBeHidden();

  await expect(
    taskRow(page, 'Pagar la luz').getByText(es.reminders.indicator(1), { exact: true }),
  ).toHaveCount(0);
  await expect(rowIndicator(page, 'Pagar la luz', es.tasks.pinned)).toHaveCount(0);
});

test('no se aceptan fechas pasadas', async ({ page }) => {
  const form = await openNewTask(page);
  await form.getByRole('button', { name: es.reminders.add }).click();
  const sheet = dialog(page, es.reminders.newReminder);
  await setTime(sheet, 1, localDate(-1), '09:00');
  await sheet.getByRole('button', { name: es.reminders.done }).click();
  await expect(sheet.getByText(es.reminders.errorPast)).toBeVisible();
  await expect(sheet).toBeVisible();
});

test('anclar, desanclar y agregar un recordatorio desde el menú', async ({ page }) => {
  await createTask(page, 'Llamar al banco');
  const menu = es.tasks.menu('Llamar al banco');

  await taskRow(page, 'Llamar al banco').getByRole('button', { name: menu }).click();
  await chooseMenuItem(page, menu, es.reminders.menuPin);
  await expect(page.getByText(es.reminders.pinnedToast)).toBeVisible();
  await expect(rowIndicator(page, 'Llamar al banco', es.tasks.pinned)).toBeVisible();

  // La ventana propone la próxima hora en punto: alcanza con "Listo".
  await taskRow(page, 'Llamar al banco').getByRole('button', { name: menu }).click();
  await chooseMenuItem(page, menu, es.reminders.add);
  const sheet = dialog(page, es.reminders.newReminder);
  await sheet.getByRole('button', { name: es.reminders.done }).click();
  await expect(sheet).toBeHidden();
  await expect(page.getByText(es.reminders.added)).toBeVisible();
  await expect(
    taskRow(page, 'Llamar al banco').getByText(es.reminders.indicator(1), { exact: true }).first(),
  ).toBeAttached();

  await taskRow(page, 'Llamar al banco').getByRole('button', { name: menu }).click();
  await chooseMenuItem(page, menu, es.reminders.menuUnpin);
  await expect(rowIndicator(page, 'Llamar al banco', es.tasks.pinned)).toHaveCount(0);
});

test('en la web no hay diagnóstico de notificaciones', async ({ page }) => {
  await page.getByRole('link', { name: es.nav.settings }).click();
  await expect(page.getByRole('heading', { name: es.settings.title })).toBeVisible();
  await expect(page.getByText(es.notifications.rowSummary)).toHaveCount(0);

  await openApp(page, '/settings/notifications');
  await expect(page.getByText(es.notifications.androidOnly)).toBeVisible();
});
