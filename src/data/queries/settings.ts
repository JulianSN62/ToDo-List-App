import { useQuery } from '@powersync/react';
import { useMemo } from 'react';
import { toSettings } from '../mappers';
import type { UserSettingsRow } from '../schema';
import type { UserSettings } from '../types';

// Configuración sincronizada (con valores por defecto hasta el primer sync).
export function useSettings(): UserSettings {
  const { data } = useQuery<UserSettingsRow>('SELECT * FROM user_settings LIMIT 1');
  return useMemo(() => toSettings(data[0]), [data]);
}

// Igual que useSettings, pero null mientras la configuración no se descargó del servidor
// (para no permitir cambios que se perderían: la fila la crea el servidor).
export function useStoredSettings(): UserSettings | null {
  const { data } = useQuery<UserSettingsRow>('SELECT * FROM user_settings LIMIT 1');
  const row = data[0];
  return useMemo(() => (row ? toSettings(row) : null), [row]);
}
