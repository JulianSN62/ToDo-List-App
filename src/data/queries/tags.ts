import { useQuery } from '@powersync/react';
import { useMemo } from 'react';
import { sortTags } from '@/lib/tags';
import { toTag } from '../mappers';
import type { TagRow } from '../schema';
import type { Tag } from '../types';

// Lecturas reactivas de etiquetas y de su relación con las tareas.

export interface TagList {
  /** Ordenadas alfabéticamente. */
  tags: Tag[];
  byId: Map<string, Tag>;
  isLoading: boolean;
}

export function useTags(): TagList {
  const { data, isLoading } = useQuery<TagRow>('SELECT * FROM tags WHERE deleted_at IS NULL');
  return useMemo(() => {
    const tags = sortTags(data.map(toTag));
    return { tags, byId: new Map(tags.map((tag) => [tag.id, tag])), isLoading };
  }, [data, isLoading]);
}

interface TaskTagPair {
  task_id: string;
  tag_id: string;
}

export interface TaskTagIndex {
  /** Etiquetas de cada tarea, en orden alfabético. */
  tagsByTask: Map<string, Tag[]>;
  /** Cantidad de tareas (no eliminadas) de cada etiqueta. */
  taskCountByTag: Map<string, number>;
  tags: Tag[];
  tagsById: Map<string, Tag>;
}

// Relación tarea-etiqueta de toda la base (el volumen de un uso personal lo permite).
export function useTaskTagIndex(): TaskTagIndex {
  const { tags, byId } = useTags();
  const { data } = useQuery<TaskTagPair>(
    `SELECT tt.task_id, tt.tag_id
       FROM task_tags tt
       JOIN tasks t ON t.id = tt.task_id AND t.deleted_at IS NULL`,
  );
  return useMemo(() => {
    const order = new Map(tags.map((tag, index) => [tag.id, index]));
    const tagsByTask = new Map<string, Tag[]>();
    const taskCountByTag = new Map<string, number>();
    for (const pair of data) {
      const tag = byId.get(pair.tag_id);
      if (!tag) continue;
      const list = tagsByTask.get(pair.task_id) ?? [];
      if (list.some((item) => item.id === tag.id)) continue;
      list.push(tag);
      tagsByTask.set(pair.task_id, list);
      taskCountByTag.set(tag.id, (taskCountByTag.get(tag.id) ?? 0) + 1);
    }
    for (const list of tagsByTask.values()) {
      list.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
    }
    return { tagsByTask, taskCountByTag, tags, tagsById: byId };
  }, [data, tags, byId]);
}

// Etiquetas (vigentes) de una tarea, para cargar la ventana de edición.
export function useTaskTagIds(taskId: string | null): { tagIds: string[]; isLoading: boolean } {
  const { data, isLoading } = useQuery<{ tag_id: string }>(
    `SELECT DISTINCT tt.tag_id
       FROM task_tags tt
       JOIN tags g ON g.id = tt.tag_id AND g.deleted_at IS NULL
      WHERE tt.task_id = ?`,
    [taskId ?? ''],
  );
  return useMemo(() => ({ tagIds: data.map((row) => row.tag_id), isLoading }), [data, isLoading]);
}
