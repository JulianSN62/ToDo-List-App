import type { LocalFileStore, StoredFileInfo } from '../types';

// Navegador: los archivos se guardan como Blob en IndexedDB, uno por adjunto (clave = id).
// Es una base aparte de la de PowerSync; se vacía al cerrar sesión.

const DB_NAME = 'todo-files';
const STORE = 'files';

interface StoredFile {
  data: Blob;
  savedAt: number;
}

let opening: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (!opening) {
    opening = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(STORE)) {
          request.result.createObjectStore(STORE);
        }
      };
      request.onsuccess = () => {
        const db = request.result;
        // Si otra pestaña necesita actualizar la base, esta se cierra y se vuelve a abrir.
        db.onversionchange = () => {
          db.close();
          opening = null;
        };
        resolve(db);
      };
      request.onerror = () => reject(request.error ?? new Error('No se pudo abrir IndexedDB'));
      request.onblocked = () => reject(new Error('IndexedDB bloqueada por otra pestaña'));
    }).catch((error: unknown) => {
      opening = null;
      throw error;
    });
  }
  return opening;
}

async function run<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T> | void,
): Promise<T | undefined> {
  const db = await openDb();
  return new Promise<T | undefined>((resolve, reject) => {
    const transaction = db.transaction(STORE, mode);
    const request = action(transaction.objectStore(STORE));
    transaction.oncomplete = () => resolve(request ? request.result : undefined);
    transaction.onerror = () => reject(transaction.error ?? new Error('Error de IndexedDB'));
    transaction.onabort = () =>
      reject(transaction.error ?? new Error('IndexedDB canceló la operación'));
  });
}

function isStoredFile(value: unknown): value is StoredFile {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as StoredFile).data instanceof Blob &&
    typeof (value as StoredFile).savedAt === 'number'
  );
}

export const webFileStore: LocalFileStore = {
  async put(id, data) {
    const record: StoredFile = { data, savedAt: Date.now() };
    await run('readwrite', (store) => store.put(record, id));
  },

  async get(id) {
    const value = await run<unknown>('readonly', (store) => store.get(id));
    return isStoredFile(value) ? value.data : null;
  },

  async remove(ids) {
    if (ids.length === 0) return;
    await run('readwrite', (store) => {
      for (const id of ids) store.delete(id);
    });
  },

  async list() {
    const db = await openDb();
    return new Promise<StoredFileInfo[]>((resolve, reject) => {
      const result: StoredFileInfo[] = [];
      const transaction = db.transaction(STORE, 'readonly');
      const request = transaction.objectStore(STORE).openCursor();
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) return;
        const value: unknown = cursor.value;
        if (typeof cursor.key === 'string') {
          result.push({ id: cursor.key, savedAt: isStoredFile(value) ? value.savedAt : 0 });
        }
        cursor.continue();
      };
      transaction.oncomplete = () => resolve(result);
      transaction.onerror = () => reject(transaction.error ?? new Error('Error de IndexedDB'));
    });
  },

  async clear() {
    await run('readwrite', (store) => store.clear());
  },

  async requestPersistence() {
    try {
      if (navigator.storage?.persist && !(await navigator.storage.persisted())) {
        await navigator.storage.persist();
      }
    } catch {
      // Es solo un pedido: si el navegador no lo acepta, todo sigue funcionando.
    }
  },
};
