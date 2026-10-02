// @vitest-environment node
// Lo que la app guarda en Ajustes → Alertas de vencimiento pasa los CHECK reales de
// user_settings, y la validación del cliente coincide con la de la base.

import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  DUE_ALERT_DEFAULTS,
  DUE_ALERT_OFFSET_OPTIONS,
  isValidAlertTime,
  parseOffsets,
  serializeOffsets,
} from '@/lib/dueAlerts';
import { createDatabase } from './pglite.ts';

const USER_ID = '11111111-1111-4111-8111-111111111111';

let db: PGlite;

async function accepts(column: 'due_alert_offsets' | 'due_alert_time', value: string) {
  try {
    await db.query(`update public.user_settings set ${column} = $1 where owner_id = $2`, [
      value,
      USER_ID,
    ]);
    return true;
  } catch (error) {
    if (/check constraint/i.test(String(error))) return false;
    throw error;
  }
}

// Todas las combinaciones no vacías de días que se pueden marcar.
function offsetCombinations(): number[][] {
  const options = DUE_ALERT_OFFSET_OPTIONS;
  const result: number[][] = [];
  for (let mask = 1; mask < 1 << options.length; mask++) {
    result.push(options.filter((_, index) => mask & (1 << index)));
  }
  return result;
}

beforeAll(async () => {
  db = await createDatabase(['20261001000000_initial_schema.sql']);
  // El trigger del alta crea la fila de configuración con los valores por defecto.
  await db.query('insert into auth.users (id) values ($1)', [USER_ID]);
});

afterAll(async () => {
  await db.close();
});

describe('CHECK de user_settings para las alertas', () => {
  it('los valores por defecto de la base son los de la app', async () => {
    const { rows } = await db.query<{
      due_alerts_enabled: boolean;
      due_alert_offsets: string;
      due_alert_time: string;
    }>('select * from public.user_settings where owner_id = $1', [USER_ID]);
    expect(rows[0]?.due_alerts_enabled).toBe(DUE_ALERT_DEFAULTS.enabled);
    expect(parseOffsets(rows[0]?.due_alert_offsets)).toEqual(DUE_ALERT_DEFAULTS.offsets);
    expect(rows[0]?.due_alert_time).toBe(DUE_ALERT_DEFAULTS.time);
  });

  it('acepta todas las combinaciones de días que puede guardar la app', async () => {
    for (const combination of offsetCombinations()) {
      expect(await accepts('due_alert_offsets', serializeOffsets(combination))).toBe(true);
    }
  });

  it('rechaza listas mal formadas', async () => {
    for (const value of ['', '1,0', '[1,]', '[-1]', '[1.5]', '["1"]', 'null']) {
      expect(await accepts('due_alert_offsets', value), value).toBe(false);
    }
  });

  it('la validación de la hora coincide con la de la base', async () => {
    const candidates = ['00:00', '09:00', '12:30', '23:59', '24:00', '9:00', '09:60', '09:00:00'];
    for (const value of [...candidates, '', 'ab:cd', ' 09:00']) {
      expect(await accepts('due_alert_time', value), value).toBe(isValidAlertTime(value));
    }
  });
});
