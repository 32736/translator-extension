import {
  openTranslatorDatabase,
  requestToPromise,
  STORE_NAMES,
  transactionToPromise,
} from './db';

export interface FavoriteEntity {
  id: string;
  sourceText: string;
  translatedText: string;
  createdAt: number;
}

export interface FavoriteRepository {
  get(id: string): Promise<FavoriteEntity | null>;
  save(entity: FavoriteEntity): Promise<void>;
  remove(id: string): Promise<void>;
  list(limit?: number): Promise<FavoriteEntity[]>;
  clear(): Promise<void>;
}

export async function createFavoriteId(
  sourceText: string,
  translatedText: string,
): Promise<string> {
  const value = new TextEncoder().encode(`${sourceText}\u0000${translatedText}`);
  const digest = await crypto.subtle.digest('SHA-256', value);

  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
}

export class IndexedDbFavoriteRepository implements FavoriteRepository {
  async get(id: string): Promise<FavoriteEntity | null> {
    const database = await openTranslatorDatabase();
    const transaction = database.transaction(STORE_NAMES.favorites, 'readonly');
    const entity = await requestToPromise<FavoriteEntity | undefined>(
      transaction.objectStore(STORE_NAMES.favorites).get(id),
    );
    await transactionToPromise(transaction);

    return entity ?? null;
  }

  async save(entity: FavoriteEntity): Promise<void> {
    const database = await openTranslatorDatabase();
    const transaction = database.transaction(STORE_NAMES.favorites, 'readwrite');
    await requestToPromise(transaction.objectStore(STORE_NAMES.favorites).put(entity));
    await transactionToPromise(transaction);
  }

  async remove(id: string): Promise<void> {
    const database = await openTranslatorDatabase();
    const transaction = database.transaction(STORE_NAMES.favorites, 'readwrite');
    await requestToPromise(transaction.objectStore(STORE_NAMES.favorites).delete(id));
    await transactionToPromise(transaction);
  }

  async list(limit = 30): Promise<FavoriteEntity[]> {
    const database = await openTranslatorDatabase();
    const transaction = database.transaction(STORE_NAMES.favorites, 'readonly');
    const index = transaction
      .objectStore(STORE_NAMES.favorites)
      .index('createdAt');
    const entities = await new Promise<FavoriteEntity[]>((resolve, reject) => {
      const results: FavoriteEntity[] = [];
      const request = index.openCursor(null, 'prev');

      request.onsuccess = () => {
        const cursor = request.result;

        if (cursor === null || results.length >= limit) {
          resolve(results);
          return;
        }

        results.push(cursor.value as FavoriteEntity);
        cursor.continue();
      };
      request.onerror = () => reject(request.error ?? new Error('Favorite list failed'));
    });
    await transactionToPromise(transaction);

    return entities;
  }

  async clear(): Promise<void> {
    const database = await openTranslatorDatabase();
    const transaction = database.transaction(STORE_NAMES.favorites, 'readwrite');
    await requestToPromise(transaction.objectStore(STORE_NAMES.favorites).clear());
    await transactionToPromise(transaction);
  }
}
