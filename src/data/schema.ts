import { column, Schema, Table } from '@powersync/web';

// Esquema de la base local (SQLite), equivalente a las tablas de Supabase.
// Tipos locales: booleanos como integer (0/1), fechas e instantes como text (ISO).
// PowerSync agrega la columna "id" (text) automáticamente.

const tableOptions = { ignoreEmptyUpdates: true } as const;

const folders = new Table(
  {
    owner_id: column.text,
    parent_id: column.text,
    name: column.text,
    color: column.text,
    position: column.text,
    created_at: column.text,
    updated_at: column.text,
    deleted_at: column.text,
  },
  { ...tableOptions, indexes: { parent: ['parent_id'] } },
);

const tasks = new Table(
  {
    owner_id: column.text,
    folder_id: column.text,
    title: column.text,
    description: column.text,
    due_date: column.text,
    is_priority: column.integer,
    color: column.text,
    position: column.text,
    is_done: column.integer,
    done_at: column.text,
    is_pinned: column.integer,
    created_at: column.text,
    updated_at: column.text,
    deleted_at: column.text,
  },
  { ...tableOptions, indexes: { folder: ['folder_id'], due: ['due_date'] } },
);

const tags = new Table(
  {
    owner_id: column.text,
    name: column.text,
    color: column.text,
    created_at: column.text,
    updated_at: column.text,
    deleted_at: column.text,
  },
  tableOptions,
);

const task_tags = new Table(
  {
    owner_id: column.text,
    task_id: column.text,
    tag_id: column.text,
    created_at: column.text,
    updated_at: column.text,
  },
  { ...tableOptions, indexes: { task: ['task_id'], tag: ['tag_id'] } },
);

const attachments = new Table(
  {
    owner_id: column.text,
    task_id: column.text,
    kind: column.text,
    label: column.text,
    url: column.text,
    storage_path: column.text,
    file_name: column.text,
    mime_type: column.text,
    size_bytes: column.integer,
    position: column.text,
    created_at: column.text,
    updated_at: column.text,
    deleted_at: column.text,
  },
  { ...tableOptions, indexes: { task: ['task_id'] } },
);

const reminders = new Table(
  {
    owner_id: column.text,
    task_id: column.text,
    message: column.text,
    created_at: column.text,
    updated_at: column.text,
  },
  { ...tableOptions, indexes: { task: ['task_id'] } },
);

const reminder_times = new Table(
  {
    owner_id: column.text,
    reminder_id: column.text,
    task_id: column.text,
    fire_at: column.text,
    created_at: column.text,
    updated_at: column.text,
  },
  { ...tableOptions, indexes: { reminder: ['reminder_id'], task: ['task_id'] } },
);

const user_settings = new Table(
  {
    owner_id: column.text,
    completed_retention_days: column.integer,
    due_alerts_enabled: column.integer,
    due_alert_offsets: column.text,
    due_alert_time: column.text,
    created_at: column.text,
    updated_at: column.text,
  },
  tableOptions,
);

// Solo local (spec 5.5): estado de cada archivo adjunto en este dispositivo. El id es
// el del adjunto. upload_status: pending | uploading | uploaded | failed, o null si el
// archivo vino de otro dispositivo. cached = 1 si el archivo está guardado acá.
const attachment_local_state = new Table(
  {
    upload_status: column.text,
    attempts: column.integer,
    next_attempt_at: column.text,
    last_error: column.text,
    cached: column.integer,
    updated_at: column.text,
  },
  { localOnly: true },
);

export const AppSchema = new Schema({
  folders,
  tasks,
  tags,
  task_tags,
  attachments,
  reminders,
  reminder_times,
  user_settings,
  attachment_local_state,
});

export type Database = (typeof AppSchema)['types'];
export type FolderRow = Database['folders'];
export type TaskRow = Database['tasks'];
export type TagRow = Database['tags'];
export type TaskTagRow = Database['task_tags'];
export type AttachmentRow = Database['attachments'];
export type UserSettingsRow = Database['user_settings'];
export type AttachmentLocalStateRow = Database['attachment_local_state'];

// Tablas que se sincronizan y columnas booleanas de cada una (para convertir 0/1 al subir).
export const SYNCED_TABLES = [
  'folders',
  'tasks',
  'tags',
  'task_tags',
  'attachments',
  'reminders',
  'reminder_times',
  'user_settings',
] as const;

export type SyncedTable = (typeof SYNCED_TABLES)[number];

export const BOOLEAN_COLUMNS: Record<SyncedTable, readonly string[]> = {
  folders: [],
  tasks: ['is_priority', 'is_done', 'is_pinned'],
  tags: [],
  task_tags: [],
  attachments: [],
  reminders: [],
  reminder_times: [],
  user_settings: ['due_alerts_enabled'],
};
