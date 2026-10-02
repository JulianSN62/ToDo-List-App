import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import type { FileService } from '../types';

// Android: el archivo se escribe en la caché de la app (la única carpeta que el
// FileProvider comparte, ver res/xml/file_paths.xml) y se abre el menú de compartir
// para guardarlo en Drive, en Archivos o mandarlo a otra app.
export const capacitorFiles: FileService = {
  async saveAndShare(file) {
    const { uri } = await Filesystem.writeFile({
      path: file.name,
      data: file.content,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    });
    try {
      await Share.share({
        title: file.name,
        files: [uri],
        dialogTitle: file.shareTitle,
      });
      return 'saved';
    } catch (error) {
      if (error instanceof Error && /cancel/i.test(error.message)) return 'canceled';
      throw error;
    }
  },
};
