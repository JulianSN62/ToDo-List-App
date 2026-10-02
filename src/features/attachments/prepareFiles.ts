import {
  compressionPlan,
  displayFileName,
  extensionForType,
  isWithinSizeLimit,
  keepCompressed,
  normalizeMimeType,
  renameExtension,
} from '@/lib/files';
import type { NewFileDraft } from '@/lib/taskForm';
import { images, type PickedFile } from '@/platform';

// Antes de adjuntar: las fotos se comprimen (lado mayor 1600 px, calidad 0,8) y
// después se controla el límite de 10 MB (spec 10.2).

export type PreparedFile =
  { ok: true; file: NewFileDraft } | { ok: false; name: string; size: number };

export async function prepareFile(picked: PickedFile): Promise<PreparedFile> {
  const name = displayFileName(picked.name);
  const originalType = normalizeMimeType(picked.mimeType);
  let result: NewFileDraft = { name, mimeType: originalType, size: picked.size, data: picked.data };

  const plan = compressionPlan(originalType);
  if (plan) {
    try {
      const compressed = await images.compress(picked.data, plan);
      if (compressed && keepCompressed(picked.size, compressed.data.size)) {
        const type = normalizeMimeType(compressed.data.type);
        const extension = extensionForType(type);
        result = {
          name:
            extension && type !== originalType
              ? displayFileName(renameExtension(name, extension))
              : name,
          mimeType: type,
          size: compressed.data.size,
          data: compressed.data,
        };
      }
    } catch {
      // Si no se puede comprimir, se adjunta la original.
    }
  }

  if (!isWithinSizeLimit(result.size)) return { ok: false, name, size: result.size };
  return { ok: true, file: result };
}
