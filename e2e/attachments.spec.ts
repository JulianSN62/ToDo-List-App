import type { Locator, Page, Route } from '@playwright/test';
import sharp from 'sharp';
import {
  createFolder,
  dialog,
  es,
  expect,
  FAKE_USER,
  folderLink,
  openApp,
  openNewTask,
  taskButton,
  taskCheckbox,
  test,
} from './fixtures';

// Archivos adjuntos (Fase 9, spec 10.2): elegir, comprimir fotos, límite de 10 MB, cola de
// subida con "Reintentar", descarga con URL firmada, caché para ver sin conexión, quitar
// y borrado de los archivos del dispositivo al cerrar sesión. Storage es ficticio: las
// peticiones al Supabase de prueba se responden desde el test.

const STORAGE = 'https://e2e.supabase.invalid/storage/v1/object';
const PDF = Buffer.from('%PDF-1.4\n1 0 obj <<>> endobj\ntrailer <<>>\n%%EOF\n');
const CORS = { 'access-control-allow-origin': '*' };

let photo: Buffer; // 4000×3000, varios MB
let icon: Buffer; // PNG chico

test.beforeAll(async () => {
  photo = await sharp({
    create: {
      width: 4000,
      height: 3000,
      channels: 3,
      background: { r: 0, g: 0, b: 0 },
      noise: { type: 'gaussian', mean: 128, sigma: 40 },
    },
  })
    .jpeg({ quality: 92 })
    .toBuffer();
  icon = await sharp({
    create: {
      width: 120,
      height: 80,
      channels: 4,
      background: { r: 30, g: 120, b: 220, alpha: 1 },
    },
  })
    .png()
    .toBuffer();
});

interface FakeStorage {
  /** Código con el que responde la subida (200 = correcto). */
  uploadStatus: number;
  uploads: string[];
  downloads: string[];
  /** Deja de responder: las peticiones vuelven a cortarse como el resto de la red. */
  stop: () => Promise<void>;
}

// Responde la subida, la URL firmada y la descarga como lo haría Supabase Storage.
async function fakeStorage(page: Page, uploadStatus = 200): Promise<FakeStorage> {
  const state: FakeStorage = {
    uploadStatus,
    uploads: [],
    downloads: [],
    stop: () => page.unrouteAll({ behavior: 'ignoreErrors' }),
  };
  const pathOf = (route: Route, prefix: string) =>
    decodeURIComponent(new URL(route.request().url()).pathname.replace(prefix, ''));

  await page.route(`${STORAGE}/attachments/**`, async (route) => {
    const path = pathOf(route, '/storage/v1/object/attachments/');
    if (state.uploadStatus !== 200) {
      await route.fulfill({
        status: state.uploadStatus,
        headers: CORS,
        json: { statusCode: String(state.uploadStatus), error: 'Unauthorized', message: 'no' },
      });
      return;
    }
    state.uploads.push(path);
    await route.fulfill({
      status: 200,
      headers: CORS,
      json: { Id: 'e2e', Key: `attachments/${path}` },
    });
  });

  await page.route(`${STORAGE}/sign/attachments/**`, async (route) => {
    const path = pathOf(route, '/storage/v1/object/sign/attachments/');
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 200,
        headers: CORS,
        json: { signedURL: `/object/sign/attachments/${encodeURI(path)}?token=e2e` },
      });
      return;
    }
    state.downloads.push(path);
    const isPdf = path.endsWith('.pdf');
    await route.fulfill({
      status: 200,
      headers: CORS,
      contentType: isPdf ? 'application/pdf' : 'image/png',
      body: isPdf ? PDF : icon,
    });
  });
  return state;
}

interface UploadFile {
  name: string;
  mimeType: string;
  buffer: Buffer;
}

const pdfFile = (name = 'contrato.pdf'): UploadFile => ({
  name,
  mimeType: 'application/pdf',
  buffer: PDF,
});
const iconFile = (): UploadFile => ({ name: 'icono.png', mimeType: 'image/png', buffer: icon });

// "+ Archivo" abre el selector del sistema: se le pasan los archivos directamente.
async function attach(form: Locator, files: UploadFile[]): Promise<void> {
  const chooser = form.page().waitForEvent('filechooser');
  await form.getByRole('button', { name: es.files.addLabel }).click();
  await (await chooser).setFiles(files);
}

const openFileButton = (scope: Locator | Page, name: string | RegExp) =>
  scope.getByRole('button', {
    name: typeof name === 'string' ? es.files.open(name) : name,
  });

async function createTaskWithFiles(page: Page, title: string, files: UploadFile[]) {
  const form = await openNewTask(page);
  await form.getByRole('textbox', { name: es.tasks.titleLabel }).fill(title);
  await attach(form, files);
  await expect(form.getByText(es.files.status.draft)).toHaveCount(files.length);
  await form.getByRole('button', { name: es.common.create, exact: true }).click();
  await expect(form).toBeHidden();
  await expect(taskCheckbox(page, title)).toBeVisible();
}

async function openTask(page: Page, title: string): Promise<Locator> {
  await taskButton(page, title).click();
  const edit = dialog(page, es.tasks.editTask);
  await expect(edit).toBeVisible();
  return edit;
}

// Lo que hay guardado en IndexedDB (base de archivos de la app).
function storedFiles(page: Page) {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('todo-files', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('files');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const records = await new Promise<{ data: Blob }[]>((resolve, reject) => {
      const request = db.transaction('files').objectStore('files').getAll();
      request.onsuccess = () => resolve(request.result as { data: Blob }[]);
      request.onerror = () => reject(request.error);
    });
    db.close();
    return Promise.all(
      records.map(async ({ data }) => {
        let size: { width: number; height: number } | null = null;
        if (data.type.startsWith('image/')) {
          const bitmap = await createImageBitmap(data);
          size = { width: bitmap.width, height: bitmap.height };
          bitmap.close();
        }
        return { type: data.type, bytes: data.size, size };
      }),
    );
  });
}

test.beforeEach(async ({ page }) => {
  await openApp(page);
  await createFolder(page, 'Trámites');
  await folderLink(page, 'Trámites').click();
  await expect(page.getByText(es.folders.emptyTitle)).toBeVisible();
});

test('adjuntar al crear: lista, contador y "Pendiente de subir" sin servidor', async ({ page }) => {
  await createTaskWithFiles(page, 'Renovar DNI', [iconFile(), pdfFile()]);
  await expect(
    page.getByText(es.links.count(2), { exact: true }).filter({ visible: true }),
  ).toHaveCount(1);

  const edit = await openTask(page, 'Renovar DNI');
  // El PNG se pudo haber convertido a WebP al comprimirlo.
  const image = openFileButton(edit, /^Abrir icono\.(png|webp)$/);
  await expect(image.locator('img')).toBeVisible();
  await expect(openFileButton(edit, 'contrato.pdf')).toBeVisible();
  await expect(edit.getByText(es.files.status.pending)).toHaveCount(2);

  // Después de recargar siguen ahí, guardados en el dispositivo.
  await page.reload();
  const again = dialog(page, es.tasks.editTask);
  await expect(openFileButton(again, 'contrato.pdf')).toBeVisible({ timeout: 30_000 });
  await expect(openFileButton(again, /^Abrir icono\./).locator('img')).toBeVisible();
});

test('las fotos se comprimen y se rechaza lo que supera 10 MB', async ({ page }) => {
  const form = await openNewTask(page);
  await form.getByRole('textbox', { name: es.tasks.titleLabel }).fill('Fotos del auto');
  await attach(form, [
    { name: 'auto.jpg', mimeType: 'image/jpeg', buffer: photo },
    {
      name: 'video.bin',
      mimeType: 'application/octet-stream',
      buffer: Buffer.alloc(10.5 * 1024 * 1024),
    },
  ]);
  await expect(form.getByRole('alert')).toContainText('«video.bin» pesa 10,5 MB');
  await expect(openFileButton(form, 'video.bin')).toHaveCount(0);
  await expect(openFileButton(form, 'auto.jpg')).toBeVisible();
  await form.getByRole('button', { name: es.common.create, exact: true }).click();
  await expect(form).toBeHidden();

  const stored = await storedFiles(page);
  expect(stored).toHaveLength(1);
  expect(stored[0]?.type).toBe('image/jpeg');
  expect(stored[0]?.size).toEqual({ width: 1600, height: 1200 });
  expect(stored[0]?.bytes).toBeLessThan(photo.length);
});

test('si la subida falla queda "Reintentar"; al reintentar se sube', async ({
  page,
  consoleErrors,
}) => {
  const storage = await fakeStorage(page, 403);
  await createTaskWithFiles(page, 'Pagar ABL', [pdfFile('boleta.pdf')]);

  const edit = await openTask(page, 'Pagar ABL');
  await expect(edit.getByText(es.files.status.failed)).toBeVisible();
  storage.uploadStatus = 200;
  await edit.getByRole('button', { name: es.files.retryLabel('boleta.pdf') }).click();

  await expect(edit.getByText(es.files.status.failed)).toHaveCount(0);
  await expect(edit.getByText(es.files.status.pending)).toHaveCount(0);
  await expect(edit.getByText(es.files.status.uploading)).toHaveCount(0);
  expect(storage.uploads).toHaveLength(1);
  expect(storage.uploads[0]).toMatch(
    new RegExp(`^${FAKE_USER.id}/[0-9a-f-]+/[0-9a-f-]+-boleta\\.pdf$`),
  );
  // El navegador registra la respuesta 403 de la primera subida: es la esperada.
  const expected = consoleErrors.filter((message) => /status of 403/.test(message));
  for (const message of expected) consoleErrors.splice(consoleErrors.indexOf(message), 1);
});

test('descarga con URL firmada y se ve sin conexión lo ya abierto', async ({ page, context }) => {
  const storage = await fakeStorage(page);
  await createTaskWithFiles(page, 'Garantía', [iconFile(), pdfFile('factura.pdf')]);
  let edit = await openTask(page, 'Garantía');
  await expect.poll(() => storage.uploads.length).toBe(2);
  await expect(edit.getByText(es.files.status.pending)).toHaveCount(0);
  await expect(edit.getByText(es.files.status.uploading)).toHaveCount(0);
  await edit.getByRole('button', { name: es.common.cancel }).click();

  // Ajustes → Liberar espacio: se borran del dispositivo los que ya están en la nube.
  await page.getByRole('link', { name: es.nav.settings }).click();
  await expect(page.getByRole('heading', { name: es.files.storage.title })).toBeVisible();
  await page.getByRole('button', { name: es.files.storage.free }).click();
  await page
    .getByRole('dialog', { name: es.files.storage.freeTitle })
    .getByRole('button', { name: es.files.storage.free })
    .click();
  await expect(page.getByText(es.files.storage.freed)).toBeVisible();
  expect(await storedFiles(page)).toHaveLength(0);

  // Al abrir la tarea, la foto se vuelve a bajar sola para la miniatura; el PDF no.
  await openApp(page);
  await folderLink(page, 'Trámites').click();
  edit = await openTask(page, 'Garantía');
  const image = openFileButton(edit, /^Abrir icono\./);
  await expect(image.locator('img')).toBeVisible();
  await expect(edit.getByText(es.files.status.remote)).toHaveCount(1);
  expect(storage.downloads).toHaveLength(1);

  await image.click();
  const viewer = page.getByRole('dialog', { name: /^icono\./ });
  await expect(viewer.getByRole('img')).toBeVisible();
  await viewer.getByRole('button', { name: es.common.close }).click();
  await expect(viewer).toBeHidden();

  // Sin conexión: la foto sigue disponible y el PDF avisa que no está guardado.
  await storage.stop();
  await context.setOffline(true);
  await openFileButton(edit, 'factura.pdf').click();
  await expect(page.getByText(es.files.offline)).toBeVisible();
  await image.click();
  await expect(page.getByRole('dialog', { name: /^icono\./ }).getByRole('img')).toBeVisible();
  await context.setOffline(false);
});

test('quitar un archivo y cerrar sesión borra los archivos del dispositivo', async ({ page }) => {
  await createTaskWithFiles(page, 'Mudanza', [pdfFile('inventario.pdf'), pdfFile('contrato.pdf')]);
  const edit = await openTask(page, 'Mudanza');
  await edit.getByRole('button', { name: es.files.remove('inventario.pdf') }).click();
  await edit.getByRole('button', { name: es.common.save }).click();
  await expect(edit).toBeHidden();
  await expect(
    page.getByText(es.links.count(1), { exact: true }).filter({ visible: true }),
  ).toHaveCount(1);

  const reopened = await openTask(page, 'Mudanza');
  await expect(openFileButton(reopened, 'inventario.pdf')).toHaveCount(0);
  await expect(openFileButton(reopened, 'contrato.pdf')).toBeVisible();
  await reopened.getByRole('button', { name: es.common.cancel }).click();
  expect(await storedFiles(page)).toHaveLength(2);

  // Cerrar sesión avisa que hay archivos sin subir y borra todo lo guardado.
  await page.getByRole('link', { name: es.nav.settings }).click();
  await page.getByRole('button', { name: es.settings.signOut }).click();
  const confirm = page.getByRole('dialog', { name: es.settings.signOutTitle });
  await expect(confirm).toContainText(es.settings.signOutPendingWarning(1).slice(0, 10));
  await confirm.getByRole('button', { name: es.settings.signOut }).click();
  await page.waitForURL('**/login', { timeout: 20_000 });
  expect(await storedFiles(page)).toHaveLength(0);
});
