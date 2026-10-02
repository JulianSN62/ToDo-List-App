import { toColorToken } from '@/lib/colors';
import { isValidAlertTime, parseOffsets } from '@/lib/dueAlerts';
import { clampRetentionDays } from '@/lib/retention';
import type { AttachmentRow, FolderRow, TagRow, TaskRow, UserSettingsRow } from './schema';
import {
  DEFAULT_SETTINGS,
  type Folder,
  type Tag,
  type Task,
  type TaskLink,
  type UserSettings,
} from './types';

// Conversión de filas locales (snake_case, 0/1) a modelos de la UI.

type WithId<T> = T & { id: string };

export function toFolder(row: WithId<FolderRow>): Folder {
  return {
    id: row.id,
    parentId: row.parent_id ?? null,
    name: row.name ?? '',
    color: toColorToken(row.color),
    position: row.position ?? '',
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
  };
}

export function toTask(row: WithId<TaskRow>): Task {
  return {
    id: row.id,
    folderId: row.folder_id ?? '',
    title: row.title ?? '',
    description: row.description ?? null,
    dueDate: row.due_date ?? null,
    isPriority: row.is_priority === 1,
    color: toColorToken(row.color),
    position: row.position ?? '',
    isDone: row.is_done === 1,
    doneAt: row.done_at ?? null,
    isPinned: row.is_pinned === 1,
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
  };
}

export function toTag(row: WithId<TagRow>): Tag {
  return {
    id: row.id,
    name: row.name ?? '',
    color: toColorToken(row.color),
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
  };
}

export function toTaskLink(row: WithId<AttachmentRow>): TaskLink {
  return {
    id: row.id,
    taskId: row.task_id ?? '',
    url: row.url ?? '',
    label: row.label ?? null,
    position: row.position ?? '',
  };
}

export function toSettings(row: UserSettingsRow | null | undefined): UserSettings {
  if (!row) return DEFAULT_SETTINGS;
  return {
    completedRetentionDays: clampRetentionDays(
      row.completed_retention_days ?? DEFAULT_SETTINGS.completedRetentionDays,
    ),
    dueAlertsEnabled:
      row.due_alerts_enabled === null
        ? DEFAULT_SETTINGS.dueAlertsEnabled
        : row.due_alerts_enabled === 1,
    dueAlertOffsets: parseOffsets(row.due_alert_offsets) ?? DEFAULT_SETTINGS.dueAlertOffsets,
    dueAlertTime:
      row.due_alert_time && isValidAlertTime(row.due_alert_time)
        ? row.due_alert_time
        : DEFAULT_SETTINGS.dueAlertTime,
  };
}

export function boolToInt(value: boolean): number {
  return value ? 1 : 0;
}
