import { readFile } from 'node:fs/promises';
import {
  chooseMenuItem,
  createFolder,
  createTask,
  es,
  expect,
  expectNoHorizontalScroll,
  folderLink,
  localDate,
  openApp,
  taskCheckbox,
  taskRow,
  test,
} from './fixtures';

// Ajustes (Fase 6): tema, retención y respaldo JSON.

test('el tema oscuro se aplica y se recuerda al recargar', async ({ page }) => {
  await openApp(page, '/settings');
  const html = page.locator('html');
  await page.getByRole('radio', { name: es.settings.themeDark }).click();
  await expect(html).toHaveClass(/\bdark\b/);
  await page.reload();
  await expect(page.getByRole('radio', { name: es.settings.themeDark })).toBeChecked();
  await expect(html).toHaveClass(/\bdark\b/);
  await page.getByRole('radio', { name: es.settings.themeSystem }).click();
  await expect(html).not.toHaveClass(/\bdark\b/);
});

test('la retención está deshabilitada hasta la primera sincronización', async ({ page }) => {
  await openApp(page, '/settings');
  await expect(page.getByText(es.settings.retention)).toBeVisible();
  await expect(page.getByRole('button', { name: es.settings.retentionIncrease })).toBeDisabled();
  await expect(page.getByRole('button', { name: es.settings.retentionDecrease })).toBeDisabled();
  await expect(page.getByText(es.settings.retentionUnavailable)).toBeVisible();
  await expectNoHorizontalScroll(page);
});

test('Alertas de vencimiento: resumen, nota de Android y deshabilitadas sin sincronizar', async ({
  page,
}) => {
  await openApp(page, '/settings');
  // Sin configuración descargada se muestran los valores por defecto.
  const row = page.getByRole('button', { name: new RegExp(es.dueAlerts.title) });
  await expect(row).toContainText(es.dueAlerts.summary([1, 0], '09:00'));
  await row.click();

  await expect(page.getByRole('heading', { name: es.dueAlerts.title })).toBeVisible();
  await expect(page.getByText(es.dueAlerts.androidOnly)).toBeVisible();
  await expect(page.getByText(es.dueAlerts.unavailable)).toBeVisible();
  await expect(page.getByRole('switch', { name: es.dueAlerts.enable })).toBeDisabled();
  for (const days of [0, 1, 2, 3, 7]) {
    await expect(page.getByRole('checkbox', { name: es.dueAlerts.offset(days) })).toBeDisabled();
  }
  await expect(page.getByLabel(es.dueAlerts.time)).toHaveValue('09:00');
  await expectNoHorizontalScroll(page);

  await page.getByRole('button', { name: es.common.back }).click();
  await expect(page.getByRole('heading', { name: es.settings.title })).toBeVisible();
});

test('exportar el respaldo JSON', async ({ page }) => {
  await openApp(page);
  await createFolder(page, 'Trabajo nuevo');
  await folderLink(page, 'Trabajo nuevo').click();
  await createTask(page, 'Llamar al banco', { priority: true });
  await createTask(page, 'Preparar informe anual');
  await createTask(page, 'Tarea borrada');
  await taskRow(page, 'Tarea borrada')
    .getByRole('button', { name: es.tasks.menu('Tarea borrada') })
    .click();
  await chooseMenuItem(page, es.tasks.menu('Tarea borrada'), es.common.delete);
  await expect(taskCheckbox(page, 'Tarea borrada')).toHaveCount(0);

  await page.getByRole('link', { name: es.nav.settings }).click();
  await expect(page.getByText(es.backup.neverBackedUp)).toBeVisible();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: es.backup.export }).click();
  const download = await downloadPromise;

  const fileName = `mis-tareas-respaldo-${localDate()}.json`;
  expect(download.suggestedFilename()).toBe(fileName);
  const backup = JSON.parse(await readFile(await download.path(), 'utf8')) as {
    formatVersion: number;
    folders: { name: string }[];
    tasks: { title: string; is_priority: boolean; is_done: boolean }[];
    settings: unknown;
    [key: string]: unknown;
  };
  expect(backup.formatVersion).toBe(1);
  expect(backup.folders.map((folder) => folder.name)).toEqual(['Trabajo nuevo']);
  // Lo eliminado no se exporta y los booleanos van como true/false.
  expect(backup.tasks.map((task) => task.title).sort()).toEqual([
    'Llamar al banco',
    'Preparar informe anual',
  ]);
  expect(backup.tasks.find((task) => task.title === 'Llamar al banco')).toMatchObject({
    is_priority: true,
    is_done: false,
  });
  // Sin sincronizar todavía no hay configuración del servidor.
  expect(backup.settings).toBeNull();
  for (const key of ['tags', 'taskTags', 'attachments', 'reminders', 'reminderTimes']) {
    expect(Array.isArray(backup[key]), key).toBe(true);
  }

  await expect(page.getByText(es.backup.exported(fileName))).toBeVisible();
  const [lastBackupPrefix = ''] = es.backup.lastBackup('\u0000').split('\u0000');
  await expect(page.getByText(lastBackupPrefix)).toBeVisible();
});
