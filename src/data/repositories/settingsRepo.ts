import { nowIso } from '@/lib/dates';
import { isValidAlertTime, normalizeOffsets, serializeOffsets } from '@/lib/dueAlerts';
import { clampRetentionDays } from '@/lib/retention';
import { requireUserId } from '../currentUser';
import { getDb } from '../db';
import { boolToInt, toSettings } from '../mappers';
import type { UserSettingsRow } from '../schema';
import type { UserSettings } from '../types';

// Configuración sincronizada. La fila la crea el servidor al crear el usuario:
// el cliente nunca la inserta, solo la actualiza (hasta el primer sync se usan los valores por defecto).

export type DueAlertsPatch = Partial<
  Pick<UserSettings, 'dueAlertsEnabled' | 'dueAlertOffsets' | 'dueAlertTime'>
>;

export const settingsRepo = {
  // Devuelve null si la configuración todavía no se descargó del servidor.
  async getStored(): Promise<UserSettings | null> {
    const row = await getDb().getOptional<UserSettingsRow>(
      'SELECT * FROM user_settings WHERE owner_id = ? LIMIT 1',
      [requireUserId()],
    );
    return row ? toSettings(row) : null;
  },

  async updateRetentionDays(days: number): Promise<void> {
    await getDb().execute(
      'UPDATE user_settings SET completed_retention_days = ?, updated_at = ? WHERE owner_id = ?',
      [clampRetentionDays(days), nowIso(), requireUserId()],
    );
  },

  // Alertas de vencimiento (SET-3): actualiza solo las columnas indicadas, con los mismos
  // formatos que exigen los CHECK de la base.
  async updateDueAlerts(patch: DueAlertsPatch): Promise<void> {
    const columns: string[] = [];
    const values: (string | number)[] = [];
    if (patch.dueAlertsEnabled !== undefined) {
      columns.push('due_alerts_enabled = ?');
      values.push(boolToInt(patch.dueAlertsEnabled));
    }
    if (patch.dueAlertOffsets !== undefined) {
      if (normalizeOffsets(patch.dueAlertOffsets).length === 0) {
        throw new Error('Tiene que quedar al menos un día de aviso');
      }
      columns.push('due_alert_offsets = ?');
      values.push(serializeOffsets(patch.dueAlertOffsets));
    }
    if (patch.dueAlertTime !== undefined) {
      if (!isValidAlertTime(patch.dueAlertTime)) throw new Error('Hora de aviso inválida');
      columns.push('due_alert_time = ?');
      values.push(patch.dueAlertTime);
    }
    if (columns.length === 0) return;
    await getDb().execute(
      `UPDATE user_settings SET ${columns.join(', ')}, updated_at = ? WHERE owner_id = ?`,
      [...values, nowIso(), requireUserId()],
    );
  },
};
