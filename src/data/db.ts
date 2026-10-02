import { PowerSyncDatabase } from '@powersync/capacitor';
import { LogLevels, type AbstractPowerSyncDatabase, type PowerSyncLogger } from '@powersync/web';
import { LOCAL_DB_FILENAME } from '@/config/app';
import { logger } from '@/lib/logger';
import { AppSchema } from './schema';

// Base local SQLite. Toda lectura y escritura de la app pasa por acá.
// En Android usa SQLite nativo; en navegador, SQLite en WASM (lo detecta el SDK).

// Solo advertencias y errores, sin objetos que puedan contener datos de las tareas.
const powerSyncLogger: PowerSyncLogger = {
  log(record) {
    if (record.level >= LogLevels.error) logger.error(`powersync: ${record.message}`);
    else if (record.level >= LogLevels.warn) logger.warn(`powersync: ${record.message}`);
  },
};

let instance: AbstractPowerSyncDatabase | null = null;

export function getDb(): AbstractPowerSyncDatabase {
  if (!instance) {
    instance = new PowerSyncDatabase({
      schema: AppSchema,
      database: { dbFilename: LOCAL_DB_FILENAME },
      logger: powerSyncLogger,
      sync: { logLevel: LogLevels.warn },
    });
  }
  return instance;
}
