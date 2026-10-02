import { useQuery } from '@powersync/react';
import { useMemo } from 'react';
import { sortByPosition } from '@/lib/ordering';
import { toTaskFile, toTaskLink, type AttachmentFileRow } from '../mappers';
import type { AttachmentRow } from '../schema';
import type { TaskFile, TaskLink } from '../types';

// Lecturas reactivas de adjuntos: links y archivos (con su estado en este dispositivo).

export function useTaskLinks(taskId: string | null): { links: TaskLink[]; isLoading: boolean } {
  const { data, isLoading } = useQuery<AttachmentRow>(
    `SELECT * FROM attachments
      WHERE task_id = ? AND kind = 'link' AND deleted_at IS NULL`,
    [taskId ?? ''],
  );
  return useMemo(
    () => ({ links: sortByPosition(data.map(toTaskLink)), isLoading }),
    [data, isLoading],
  );
}

export function useTaskFiles(taskId: string | null): { files: TaskFile[]; isLoading: boolean } {
  const { data, isLoading } = useQuery<AttachmentFileRow>(
    `SELECT a.*, s.upload_status, s.cached
       FROM attachments a
       LEFT JOIN attachment_local_state s ON s.id = a.id
      WHERE a.task_id = ? AND a.kind = 'file' AND a.deleted_at IS NULL`,
    [taskId ?? ''],
  );
  return useMemo(
    () => ({ files: sortByPosition(data.map(toTaskFile)), isLoading }),
    [data, isLoading],
  );
}

// Cantidad de adjuntos por tarea (indicador de la fila).
export function useAttachmentCounts(): Map<string, number> {
  const { data } = useQuery<{ task_id: string; total: number }>(
    `SELECT task_id, COUNT(*) AS total FROM attachments
      WHERE deleted_at IS NULL
      GROUP BY task_id`,
  );
  return useMemo(() => new Map(data.map((row) => [row.task_id, row.total])), [data]);
}

export interface FileStorageUsage {
  /** Bytes de todos los archivos adjuntos (los borrados ocupan lugar hasta la limpieza). */
  cloudBytes: number;
  /** Bytes guardados en este dispositivo. */
  deviceBytes: number;
  /** Bytes que "Liberar espacio" puede borrar (ya están en la nube). */
  freeableBytes: number;
}

export function useFileStorageUsage(): FileStorageUsage {
  const { data } = useQuery<{
    cloud: number | null;
    device: number | null;
    freeable: number | null;
  }>(
    `SELECT SUM(a.size_bytes) AS cloud,
            SUM(CASE WHEN s.cached = 1 THEN a.size_bytes ELSE 0 END) AS device,
            SUM(CASE WHEN s.cached = 1 AND (s.upload_status IS NULL OR s.upload_status = 'uploaded')
                     THEN a.size_bytes ELSE 0 END) AS freeable
       FROM attachments a
       LEFT JOIN attachment_local_state s ON s.id = a.id
      WHERE a.kind = 'file'`,
  );
  const row = data[0];
  return useMemo(
    () => ({
      cloudBytes: row?.cloud ?? 0,
      deviceBytes: row?.device ?? 0,
      freeableBytes: row?.freeable ?? 0,
    }),
    [row?.cloud, row?.device, row?.freeable],
  );
}

/** Archivos adjuntados en este dispositivo que todavía no se subieron. */
export function usePendingFileCount(): number {
  const { data } = useQuery<{ total: number }>(
    `SELECT COUNT(*) AS total
       FROM attachment_local_state s
       JOIN attachments a ON a.id = s.id
       JOIN tasks t ON t.id = a.task_id
      WHERE s.upload_status IN ('pending', 'uploading')
        AND a.deleted_at IS NULL AND t.deleted_at IS NULL`,
  );
  return data[0]?.total ?? 0;
}
