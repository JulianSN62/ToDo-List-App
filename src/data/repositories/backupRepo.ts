import {
  backupFileName,
  buildBackup,
  serializeBackup,
  type BackupRow,
  type BackupRows,
} from '@/lib/backup';
import { storage } from '@/platform';
import { toServerValues } from '../connector';
import { requireUserId } from '../currentUser';
import { getDb } from '../db';
import type { SyncedTable } from '../schema';

// Respaldo JSON a partir de la base local (funciona sin conexión).
// Las filas se exportan como en el servidor: booleanos true/false en vez de 0/1.

const LAST_BACKUP_KEY = 'todo.lastBackupAt';

export interface BackupExport {
  fileName: string;
  content: string;
}

async function readTable(table: SyncedTable, ownerId: string): Promise<BackupRow[]> {
  const rows = await getDb().getAll<BackupRow>(
    `SELECT * FROM ${table} WHERE owner_id = ? ORDER BY created_at, id`,
    [ownerId],
  );
  return rows.map((row) => toServerValues(table, row) as BackupRow);
}

export const backupRepo = {
  async createExport(now: Date = new Date()): Promise<BackupExport> {
    const ownerId = requireUserId();
    const [folders, tasks, tags, taskTags, attachments, reminders, reminderTimes, settings] =
      await Promise.all([
        readTable('folders', ownerId),
        readTable('tasks', ownerId),
        readTable('tags', ownerId),
        readTable('task_tags', ownerId),
        readTable('attachments', ownerId),
        readTable('reminders', ownerId),
        readTable('reminder_times', ownerId),
        readTable('user_settings', ownerId),
      ]);
    const rows: BackupRows = {
      folders,
      tasks,
      tags,
      taskTags,
      attachments,
      reminders,
      reminderTimes,
      settings: settings[0] ?? null,
    };
    return {
      fileName: backupFileName(now),
      content: serializeBackup(buildBackup(rows, now)),
    };
  },

  // Fecha del último respaldo exportado en este dispositivo (no se sincroniza).
  async getLastExportedAt(): Promise<Date | null> {
    const raw = await storage.getItem(LAST_BACKUP_KEY);
    if (!raw) return null;
    const date = new Date(raw);
    return Number.isNaN(date.getTime()) ? null : date;
  },

  async markExported(now: Date = new Date()): Promise<void> {
    await storage.setItem(LAST_BACKUP_KEY, now.toISOString());
  },
};
