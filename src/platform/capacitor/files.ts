import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { sanitizeFileName } from '@/lib/files';
import type { BinaryFile, FileService, SaveResult } from '../types';
import { webFiles } from '../web/files';

// Android: el archivo se escribe en la caché de la app, en exports/ (respaldo) o attachments/
// (adjuntos), las únicas carpetas que el FileProvider comparte (res/xml/file_paths.xml), y se
// abre el menú de compartir para guardarlo en Drive, en Archivos o mandarlo a otra app.
// Los adjuntos se eligen con el mismo selector que en la web (el WebView lo soporta).
// La cámara también: con capture, Capacitor abre la app de cámara y la foto queda en
// Pictures/ de la carpeta externa propia de la app (file_paths.xml); se borra al leerla.

async function share(uri: string, title: string, dialogTitle?: string): Promise<SaveResult> {
  try {
    await Share.share({ title, files: [uri], dialogTitle });
    return 'saved';
  } catch (error) {
    if (error instanceof Error && /cancel/i.test(error.message)) return 'canceled';
    throw error;
  }
}

function toBase64(data: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      resolve(result.slice(result.indexOf(',') + 1));
    };
    reader.onerror = () => reject(reader.error ?? new Error('No se pudo leer el archivo'));
    reader.readAsDataURL(data);
  });
}

async function shareBinary(file: BinaryFile): Promise<SaveResult> {
  const { uri } = await Filesystem.writeFile({
    path: `attachments/${sanitizeFileName(file.name)}`,
    data: await toBase64(file.data),
    directory: Directory.Cache,
    recursive: true,
  });
  return share(uri, file.name);
}

const SHARED_DIRS = ['exports', 'attachments'];

// Carpeta donde Capacitor guarda las fotos de la cámara (getExternalFilesDir(Pictures)).
const CAMERA_DIR = 'Pictures';

async function removeDir(path: string, directory: Directory): Promise<void> {
  try {
    await Filesystem.rmdir({ path, directory, recursive: true });
  } catch {
    // La carpeta no existe (nunca se usó): no hay nada que borrar.
  }
}

export const capacitorFiles: FileService = {
  async saveAndShare(file) {
    const { uri } = await Filesystem.writeFile({
      path: `exports/${sanitizeFileName(file.name)}`,
      data: file.content,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
      recursive: true,
    });
    return share(uri, file.name, file.shareTitle);
  },

  async clearShared() {
    for (const path of SHARED_DIRS) await removeDir(path, Directory.Cache);
    await removeDir(CAMERA_DIR, Directory.External);
  },

  pickFiles: webFiles.pickFiles,

  // La foto se copia a memoria antes de borrar el archivo temporal de la cámara.
  async takePhoto() {
    const photo = await webFiles.takePhoto();
    if (!photo) return null;
    try {
      const data = new Blob([await photo.data.arrayBuffer()], { type: photo.mimeType });
      return { ...photo, data, size: data.size };
    } finally {
      await removeDir(CAMERA_DIR, Directory.External);
    }
  },

  saveFile: shareBinary,

  async openPdf(file) {
    await shareBinary(file);
  },
};
