import { nowIso } from '@/lib/dates';
import { clampRetentionDays } from '@/lib/retention';
import { requireUserId } from '../currentUser';
import { getDb } from '../db';
import { toSettings } from '../mappers';
import type { UserSettingsRow } from '../schema';
import type { UserSettings } from '../types';

// Configuración sincronizada. La fila la crea el servidor al crear el usuario:
// el cliente nunca la inserta, solo la actualiza (hasta el primer sync se usan los valores por defecto).

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
};
