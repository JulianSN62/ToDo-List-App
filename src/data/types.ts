import type { ColorToken } from '@/lib/colors';

// Modelos que usa la UI. Los repositorios convierten desde/hacia las filas locales.

export interface Folder {
  id: string;
  parentId: string | null;
  name: string;
  color: ColorToken | null;
  position: string;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface Task {
  id: string;
  folderId: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  isPriority: boolean;
  color: ColorToken | null;
  position: string;
  isDone: boolean;
  doneAt: string | null;
  isPinned: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface Tag {
  id: string;
  name: string;
  color: ColorToken | null;
  createdAt: string | null;
  updatedAt: string | null;
}

// Link adjunto a una tarea (tabla attachments con kind = 'link').
export interface TaskLink {
  id: string;
  taskId: string;
  url: string;
  label: string | null;
  position: string;
}

export interface UserSettings {
  completedRetentionDays: number;
  dueAlertsEnabled: boolean;
  dueAlertOffsets: number[];
  dueAlertTime: string;
}

export const DEFAULT_SETTINGS: UserSettings = {
  completedRetentionDays: 7,
  dueAlertsEnabled: true,
  dueAlertOffsets: [1, 0],
  dueAlertTime: '09:00',
};

export interface CurrentUser {
  id: string;
  email: string;
}
