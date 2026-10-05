// Única puerta de entrada a los datos para la UI.
// La UI nunca importa PowerSync ni Supabase directamente: todo pasa por acá.

export type {
  CurrentUser,
  FileStatus,
  Folder,
  Reminder,
  Tag,
  Task,
  TaskFile,
  TaskLink,
  UserSettings,
} from './types';
export { DEFAULT_SETTINGS } from './types';

export { DataProvider } from './DataProvider';

export { folderRepo, type DeletedFolderSnapshot } from './repositories/folderRepo';
export {
  taskRepo,
  type LinkInput,
  type NewTaskInput,
  type TaskEdits,
  type TaskPatch,
} from './repositories/taskRepo';
export { tagRepo, TagNameTakenError, type TagInput } from './repositories/tagRepo';
export { settingsRepo } from './repositories/settingsRepo';
export { backupRepo, type BackupExport } from './repositories/backupRepo';
export { runStartupCleanup } from './repositories/maintenance';
export { reminderRepo } from './repositories/reminderRepo';
export {
  fileRepo,
  FileFetchError,
  type FileFetchErrorKind,
  type NewFileInput,
} from './repositories/attachmentRepo';

export { useFolderTree, useFolderCounts, type FolderTree } from './queries/folders';
export {
  useAllTasks,
  useDueTasks,
  useFolderTasks,
  usePendingTasks,
  usePinnedTasks,
  useTask,
} from './queries/tasks';
export {
  useTags,
  useTaskTagIds,
  useTaskTagIndex,
  type TagList,
  type TaskTagIndex,
} from './queries/tags';
export {
  useAttachmentCounts,
  useFileStorageUsage,
  usePendingFileCount,
  useTaskFiles,
  useTaskLinks,
  type FileStorageUsage,
} from './queries/attachments';
export { useSettings, useStoredSettings } from './queries/settings';
export { useReminderCounts, useTaskReminders } from './queries/reminders';

export { useSyncState, useOnline, useHasSynced, type SyncKind, type SyncState } from './syncState';
export { startSync, syncNow, stopSyncAndClear, getPendingUploadCount } from './sync';
export { startFileSync, stopFileSync, wakeFileSync } from './fileSync';
export {
  startNotificationSync,
  stopNotificationSync,
  wakeNotificationSync,
} from './notificationSync';

export {
  AuthFlowError,
  requestCode,
  verifyCode,
  resolveInitialAuth,
  subscribeToAuthChanges,
  setAutoRefresh,
  signOutLocal,
  type AuthErrorKind,
  type AuthChange,
} from './auth';
export {
  setCurrentUser,
  getCurrentUser,
  saveKnownUser,
  loadKnownUser,
  clearKnownUser,
} from './currentUser';
