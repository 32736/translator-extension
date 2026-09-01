export const TRANSLATOR_DATABASE_NAME = 'translator_db';
export const TRANSLATOR_DATABASE_VERSION = 1;

export const STORE_NAMES = {
  translations: 'translations',
  history: 'history',
  favorites: 'favorites',
} as const;

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
  });
}

function transactionToPromise(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB transaction failed'));
    transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB transaction aborted'));
  });
}

export async function openTranslatorDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(
      TRANSLATOR_DATABASE_NAME,
      TRANSLATOR_DATABASE_VERSION,
    );

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(STORE_NAMES.translations)) {
        const translations = database.createObjectStore(STORE_NAMES.translations, {
          keyPath: 'id',
        });
        translations.createIndex('lastUsedAt', 'lastUsedAt');
        translations.createIndex('createdAt', 'createdAt');
      }

      if (!database.objectStoreNames.contains(STORE_NAMES.history)) {
        const history = database.createObjectStore(STORE_NAMES.history, {
          keyPath: 'id',
        });
        history.createIndex('createdAt', 'createdAt');
      }

      if (!database.objectStoreNames.contains(STORE_NAMES.favorites)) {
        const favorites = database.createObjectStore(STORE_NAMES.favorites, {
          keyPath: 'id',
        });
        favorites.createIndex('createdAt', 'createdAt');
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB open failed'));
  });
}

export { requestToPromise, transactionToPromise };
