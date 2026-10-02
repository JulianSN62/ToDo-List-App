import { useQuery } from '@powersync/react';
import { useMemo } from 'react';
import { buildChildrenMap, computeRecursiveCounts, indexById, type FolderCounts } from '@/lib/tree';
import { toFolder } from '../mappers';
import type { FolderRow } from '../schema';
import type { Folder } from '../types';

// Lecturas reactivas de carpetas: se actualizan solas ante cambios locales o sincronizados.

export interface FolderTree {
  folders: Folder[];
  byId: Map<string, Folder>;
  children: Map<string | null, Folder[]>;
  isLoading: boolean;
}

export function useFolderTree(): FolderTree {
  const { data, isLoading } = useQuery<FolderRow>('SELECT * FROM folders WHERE deleted_at IS NULL');
  return useMemo(() => {
    const folders = data.map(toFolder);
    return {
      folders,
      byId: indexById(folders),
      children: buildChildrenMap(folders),
      isLoading,
    };
  }, [data, isLoading]);
}

interface CountRow {
  folder_id: string;
  pending: number;
  overdue: number;
}

// Pendientes y vencidas por carpeta, sumando todas sus subcarpetas.
export function useFolderCounts(
  children: Map<string | null, Folder[]>,
  today: string,
): Map<string, FolderCounts> {
  const { data } = useQuery<CountRow>(
    `SELECT folder_id,
            COUNT(*) AS pending,
            SUM(CASE WHEN due_date IS NOT NULL AND due_date < ? THEN 1 ELSE 0 END) AS overdue
       FROM tasks
      WHERE deleted_at IS NULL AND is_done = 0
      GROUP BY folder_id`,
    [today],
  );
  return useMemo(() => {
    const direct = new Map<string, FolderCounts>(
      data.map((row) => [row.folder_id, { pending: row.pending, overdue: row.overdue ?? 0 }]),
    );
    return computeRecursiveCounts(children, direct);
  }, [data, children]);
}
