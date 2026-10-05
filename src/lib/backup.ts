import { todayLocalDate } from './dates';

// Respaldo JSON (spec 7.8). Las filas conservan los nombres de columna de la base
// del servidor, para poder restaurarlas en el futuro sin traducciones.
// No incluye lo eliminado lógicamente ni lo que depende de algo eliminado
// (por ejemplo, los links de una tarea eliminada o las tareas de una carpeta eliminada).
// Los archivos adjuntos no van dentro del JSON: solo sus datos y su storage_path.

export const BACKUP_FORMAT_VERSION = 1;

export type BackupRow = { id: string } & Record<string, unknown>;

export interface BackupRows {
  folders: BackupRow[];
  tasks: BackupRow[];
  tags: BackupRow[];
  taskTags: BackupRow[];
  attachments: BackupRow[];
  reminders: BackupRow[];
  reminderTimes: BackupRow[];
  /** null si la configuración todavía no se descargó del servidor. */
  settings: Record<string, unknown> | null;
}

export interface BackupFile extends BackupRows {
  formatVersion: typeof BACKUP_FORMAT_VERSION;
  exportedAt: string;
}

function isNotDeleted(row: BackupRow): boolean {
  return row.deleted_at === null || row.deleted_at === undefined;
}

function refId(row: BackupRow, column: string): string | null {
  const value = row[column];
  return typeof value === 'string' ? value : null;
}

// Carpetas que se ven en la app: no eliminadas y con todos sus ancestros vivos.
function liveFolderIds(folders: readonly BackupRow[]): Set<string> {
  const byId = new Map(folders.map((folder) => [folder.id, folder]));
  const known = new Map<string, boolean>();

  for (const folder of folders) {
    const chain: string[] = [];
    let current: BackupRow | undefined = folder;
    let live = true;
    while (current) {
      const cached = known.get(current.id);
      if (cached !== undefined) {
        live = cached;
        break;
      }
      if (chain.includes(current.id) || !isNotDeleted(current)) {
        live = false;
        break;
      }
      chain.push(current.id);
      const parentId = refId(current, 'parent_id');
      if (parentId === null) break;
      current = byId.get(parentId);
      // Padre inexistente (todavía no sincronizado o purgado): la carpeta no se muestra.
      if (!current) live = false;
    }
    for (const id of chain) known.set(id, live);
  }

  return new Set([...known].filter(([, live]) => live).map(([id]) => id));
}

export function buildBackup(rows: BackupRows, exportedAt: Date): BackupFile {
  const folderIds = liveFolderIds(rows.folders);
  const folders = rows.folders.filter((folder) => folderIds.has(folder.id));

  const tasks = rows.tasks.filter(
    (task) => isNotDeleted(task) && folderIds.has(refId(task, 'folder_id') ?? ''),
  );
  const taskIds = new Set(tasks.map((task) => task.id));
  const isLiveTask = (row: BackupRow) => taskIds.has(refId(row, 'task_id') ?? '');

  const tags = rows.tags.filter(isNotDeleted);
  const tagIds = new Set(tags.map((tag) => tag.id));

  const reminders = rows.reminders.filter(isLiveTask);
  const reminderIds = new Set(reminders.map((reminder) => reminder.id));

  return {
    formatVersion: BACKUP_FORMAT_VERSION,
    exportedAt: exportedAt.toISOString(),
    folders,
    tasks,
    tags,
    taskTags: rows.taskTags.filter(
      (taskTag) => isLiveTask(taskTag) && tagIds.has(refId(taskTag, 'tag_id') ?? ''),
    ),
    attachments: rows.attachments.filter(
      (attachment) => isNotDeleted(attachment) && isLiveTask(attachment),
    ),
    reminders,
    reminderTimes: rows.reminderTimes.filter(
      (time) => isLiveTask(time) && reminderIds.has(refId(time, 'reminder_id') ?? ''),
    ),
    settings: rows.settings,
  };
}

// todo-list-respaldo-YYYY-MM-DD.json, con la fecha local del dispositivo.
export function backupFileName(date: Date): string {
  return `todo-list-respaldo-${todayLocalDate(date)}.json`;
}

export function serializeBackup(backup: BackupFile): string {
  return `${JSON.stringify(backup, null, 2)}\n`;
}
