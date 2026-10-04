import {
  chooseMenuItem,
  createFolder,
  createTask,
  dialog,
  es,
  expect,
  folderLink,
  openApp,
  taskButton,
  taskCheckbox,
  taskRow,
  test,
} from './fixtures';

// Modo sin conexión (spec 8.1 y 15.1): la app abre desde el service worker y se puede
// crear, editar y borrar contra la base local. Los cambios quedan pendientes de subir.
// Sin backend no se puede comprobar la subida real: eso queda como prueba manual con
// dos navegadores y una cuenta real.

function pendingPattern(text: (count: number) => string): RegExp {
  return new RegExp(text(1234).replace('1234', '\\d+').replace('pendiente', 'pendientes?'));
}

test('sin conexión: abre, crea, edita y borra; los cambios quedan pendientes', async ({
  page,
  context,
}) => {
  await openApp(page);
  // El service worker tiene que estar activo y controlando la página.
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null))
    .toBe(true);

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: es.nav.folders })).toBeVisible({
    timeout: 30_000,
  });

  await createFolder(page, 'Viaje');
  await folderLink(page, 'Viaje').click();
  await createTask(page, 'Comprar pasajes');
  await createTask(page, 'Hacer la valija');

  await taskButton(page, 'Comprar pasajes').click();
  const edit = dialog(page, es.tasks.editTask);
  await edit.getByRole('textbox', { name: es.tasks.titleLabel }).fill('Comprar pasajes en tren');
  await edit.getByRole('button', { name: es.common.save }).click();
  await expect(taskCheckbox(page, 'Comprar pasajes en tren')).toBeVisible();

  await taskRow(page, 'Hacer la valija')
    .getByRole('button', { name: es.tasks.menu('Hacer la valija') })
    .click();
  await chooseMenuItem(page, es.tasks.menu('Hacer la valija'), es.common.delete);
  await expect(taskCheckbox(page, 'Hacer la valija')).toHaveCount(0);

  await expect(
    page
      .getByRole('status')
      .filter({ hasText: pendingPattern(es.sync.offline) })
      .first(),
  ).toBeAttached();
  await page.getByRole('link', { name: es.nav.settings }).click();
  await expect(page.getByText(pendingPattern(es.sync.pendingChanges))).toBeVisible();

  // Lo hecho sin conexión sigue ahí después de recargar.
  await openApp(page);
  await folderLink(page, 'Viaje').click();
  await expect(taskCheckbox(page, 'Comprar pasajes en tren')).toBeVisible();
  await expect(taskCheckbox(page, 'Hacer la valija')).toHaveCount(0);

  // Al volver la conexión la app sigue funcionando (el servidor ficticio no responde).
  await context.setOffline(false);
  await expect(page.getByRole('status').filter({ hasText: es.sync.offline(0) })).toHaveCount(0);
  await createTask(page, 'Reservar hotel');
});
