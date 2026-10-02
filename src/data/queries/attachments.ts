import { useQuery } from '@powersync/react';
import { useMemo } from 'react';
import { sortByPosition } from '@/lib/ordering';
import { toTaskLink } from '../mappers';
import type { AttachmentRow } from '../schema';
import type { TaskLink } from '../types';

// Lecturas reactivas de adjuntos. Por ahora solo hay links (los archivos llegan en la Fase 9).

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

// Cantidad de adjuntos por tarea (indicador de la fila).
export function useAttachmentCounts(): Map<string, number> {
  const { data } = useQuery<{ task_id: string; total: number }>(
    `SELECT task_id, COUNT(*) AS total FROM attachments
      WHERE deleted_at IS NULL
      GROUP BY task_id`,
  );
  return useMemo(() => new Map(data.map((row) => [row.task_id, row.total])), [data]);
}
