import {
  UpdateType,
  type AbstractPowerSyncDatabase,
  type CrudEntry,
  type PowerSyncBackendConnector,
  type PowerSyncCredentials,
} from '@powersync/web';
import { requireEnv } from '@/config/env';
import { logger } from '@/lib/logger';
import { BOOLEAN_COLUMNS, SYNCED_TABLES, type SyncedTable } from './schema';
import { getSupabase } from './supabaseClient';

// Errores de Postgres/PostgREST que no se arreglan reintentando (datos inválidos,
// violación de restricciones, permisos de RLS o columnas inexistentes).
// Se descarta ese cambio para no bloquear la cola de subida para siempre.
const FATAL_CODES = [/^22...$/, /^23...$/, /^42501$/, /^42P01$/, /^42703$/, /^PGRST204$/];

function isSyncedTable(table: string): table is SyncedTable {
  return (SYNCED_TABLES as readonly string[]).includes(table);
}

function errorCode(error: unknown): string | undefined {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as { code?: unknown }).code;
    return typeof code === 'string' ? code : undefined;
  }
  return undefined;
}

// SQLite guarda booleanos como 0/1; Postgres espera true/false.
export function toServerValues(
  table: SyncedTable,
  data: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...data };
  for (const column of BOOLEAN_COLUMNS[table]) {
    const value = result[column];
    if (value === 0 || value === 1) result[column] = value === 1;
  }
  return result;
}

export class SupabaseConnector implements PowerSyncBackendConnector {
  // Entrega a PowerSync el token de la sesión de Supabase.
  async fetchCredentials(): Promise<PowerSyncCredentials | null> {
    const { data, error } = await getSupabase().auth.getSession();
    if (error) {
      // Normalmente es falta de conexión: PowerSync vuelve a intentar más tarde.
      throw new Error('No se pudo obtener la sesión para sincronizar');
    }
    if (!data.session) return null;
    return {
      endpoint: requireEnv().powerSyncUrl,
      token: data.session.access_token,
    };
  }

  // Sube los cambios locales pendientes, en orden y por transacción.
  async uploadData(database: AbstractPowerSyncDatabase): Promise<void> {
    const transaction = await database.getNextCrudTransaction();
    if (!transaction) return;

    const supabase = getSupabase();
    let lastOp: CrudEntry | null = null;

    try {
      for (const op of transaction.crud) {
        lastOp = op;
        if (!isSyncedTable(op.table)) continue;
        const table = supabase.from(op.table);
        const values = toServerValues(op.table, op.opData ?? {});
        let error: unknown = null;

        switch (op.op) {
          case UpdateType.PUT: {
            ({ error } = await table.upsert({ ...values, id: op.id }));
            break;
          }
          case UpdateType.PATCH: {
            if (Object.keys(values).length === 0) break;
            ({ error } = await table.update(values).eq('id', op.id));
            break;
          }
          case UpdateType.DELETE: {
            ({ error } = await table.delete().eq('id', op.id));
            break;
          }
        }

        if (error) throw error;
      }
      await transaction.complete();
    } catch (error) {
      const code = errorCode(error);
      if (code && FATAL_CODES.some((pattern) => pattern.test(code))) {
        // Nunca se loguean los datos del cambio, solo su ubicación técnica.
        logger.warn('Cambio rechazado por el servidor y descartado', {
          table: lastOp?.table,
          op: lastOp?.op,
          code,
        });
        await transaction.complete();
        return;
      }
      // Error recuperable (red, servidor temporalmente caído): PowerSync reintenta.
      throw error;
    }
  }
}
