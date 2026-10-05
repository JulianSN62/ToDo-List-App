import { describe, expect, it } from 'vitest';
import {
  BACKUP_FORMAT_VERSION,
  backupFileName,
  buildBackup,
  serializeBackup,
  type BackupRow,
  type BackupRows,
} from './backup';

const DELETED = '2026-10-01T10:00:00Z';

function folder(id: string, parentId: string | null, deletedAt: string | null = null): BackupRow {
  return { id, parent_id: parentId, name: id, deleted_at: deletedAt };
}

function task(id: string, folderId: string, deletedAt: string | null = null): BackupRow {
  return { id, folder_id: folderId, title: id, is_done: false, deleted_at: deletedAt };
}

function emptyRows(): BackupRows {
  return {
    folders: [],
    tasks: [],
    tags: [],
    taskTags: [],
    attachments: [],
    reminders: [],
    reminderTimes: [],
    settings: null,
  };
}

const ids = (rows: readonly BackupRow[]) => rows.map((row) => row.id);

describe('respaldo JSON', () => {
  it('incluye la versión de formato y la fecha de exportación', () => {
    const backup = buildBackup(emptyRows(), new Date('2026-10-02T15:30:00Z'));
    expect(backup.formatVersion).toBe(BACKUP_FORMAT_VERSION);
    expect(backup.exportedAt).toBe('2026-10-02T15:30:00.000Z');
    expect(Object.keys(backup)).toEqual([
      'formatVersion',
      'exportedAt',
      'folders',
      'tasks',
      'tags',
      'taskTags',
      'attachments',
      'reminders',
      'reminderTimes',
      'settings',
    ]);
  });

  it('excluye carpetas eliminadas y sus subcarpetas', () => {
    const rows = emptyRows();
    rows.folders = [
      folder('root', null),
      folder('child', 'root'),
      folder('gone', null, DELETED),
      folder('under-gone', 'gone', DELETED),
      folder('orphan', 'missing'),
    ];
    expect(ids(buildBackup(rows, new Date()).folders)).toEqual(['root', 'child']);
  });

  it('excluye tareas eliminadas o dentro de carpetas eliminadas', () => {
    const rows = emptyRows();
    rows.folders = [folder('a', null), folder('gone', null, DELETED)];
    rows.tasks = [task('t1', 'a'), task('t2', 'a', DELETED), task('t3', 'gone')];
    expect(ids(buildBackup(rows, new Date()).tasks)).toEqual(['t1']);
  });

  it('excluye lo que depende de tareas o etiquetas eliminadas', () => {
    const rows = emptyRows();
    rows.folders = [folder('a', null)];
    rows.tasks = [task('live', 'a'), task('dead', 'a', DELETED)];
    rows.tags = [
      { id: 'tag1', name: 'Urgente', deleted_at: null },
      { id: 'tag2', name: 'Vieja', deleted_at: DELETED },
    ];
    rows.taskTags = [
      { id: 'tt1', task_id: 'live', tag_id: 'tag1' },
      { id: 'tt2', task_id: 'live', tag_id: 'tag2' },
      { id: 'tt3', task_id: 'dead', tag_id: 'tag1' },
    ];
    rows.attachments = [
      { id: 'l1', task_id: 'live', kind: 'link', deleted_at: null },
      { id: 'l2', task_id: 'live', kind: 'link', deleted_at: DELETED },
      { id: 'l3', task_id: 'dead', kind: 'link', deleted_at: null },
    ];
    rows.reminders = [
      { id: 'r1', task_id: 'live' },
      { id: 'r2', task_id: 'dead' },
    ];
    rows.reminderTimes = [
      { id: 'rt1', reminder_id: 'r1', task_id: 'live' },
      { id: 'rt2', reminder_id: 'r2', task_id: 'dead' },
    ];

    const backup = buildBackup(rows, new Date());
    expect(ids(backup.tags)).toEqual(['tag1']);
    expect(ids(backup.taskTags)).toEqual(['tt1']);
    expect(ids(backup.attachments)).toEqual(['l1']);
    expect(ids(backup.reminders)).toEqual(['r1']);
    expect(ids(backup.reminderTimes)).toEqual(['rt1']);
  });

  it('conserva las filas tal como vienen (columnas y valores)', () => {
    const rows = emptyRows();
    rows.folders = [folder('a', null)];
    rows.tasks = [{ ...task('t1', 'a'), is_priority: true, due_date: '2026-10-05' }];
    rows.settings = { completed_retention_days: 7, due_alerts_enabled: true };
    const backup = buildBackup(rows, new Date());
    expect(backup.tasks[0]).toEqual(rows.tasks[0]);
    expect(backup.settings).toEqual(rows.settings);
  });

  it('arma el nombre del archivo con la fecha local', () => {
    expect(backupFileName(new Date(2026, 0, 5, 23, 59))).toBe('todo-list-respaldo-2026-01-05.json');
  });

  it('serializa en JSON válido', () => {
    const backup = buildBackup(emptyRows(), new Date('2026-10-02T00:00:00Z'));
    expect(JSON.parse(serializeBackup(backup))).toEqual(backup);
  });
});
