import {
  openTranslatorDatabase,
  requestToPromise,
  STORE_NAMES,
  transactionToPromise,
} from './db';

export interface TranslationCacheEntity {
  id: string;
  sourceText: string;
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  provider: string;
  createdAt: number;
  lastUsedAt: number;
  hitCount: number;
}

export interface CacheRepository {
  get(id: string): Promise<TranslationCacheEntity | null>;
  put(entity: TranslationCacheEntity): Promise<void>;
  clear(): Promise<void>;
}

export class IndexedDbCacheRepository implements CacheRepository {
  async get(id: string): Promise<TranslationCacheEntity | null> {
    const database = await openTranslatorDatabase();
    const transaction = database.transaction(STORE_NAMES.translations, 'readwrite');
    const store = transaction.objectStore(STORE_NAMES.translations);
    const entity = await requestToPromise<TranslationCacheEntity | undefined>(
      store.get(id),
    );

    if (entity === undefined) {
      await transactionToPromise(transaction);
      return null;
    }

    const updatedEntity = {
      ...entity,
      lastUsedAt: Date.now(),
      hitCount: entity.hitCount + 1,
    };
    await requestToPromise(store.put(updatedEntity));
    await transactionToPromise(transaction);

    return updatedEntity;
  }

  async put(entity: TranslationCacheEntity): Promise<void> {
    const database = await openTranslatorDatabase();
    const transaction = database.transaction(STORE_NAMES.translations, 'readwrite');
    await requestToPromise(transaction.objectStore(STORE_NAMES.translations).put(entity));
    await transactionToPromise(transaction);
  }

  async clear(): Promise<void> {
    const database = await openTranslatorDatabase();
    const transaction = database.transaction(STORE_NAMES.translations, 'readwrite');
    await requestToPromise(transaction.objectStore(STORE_NAMES.translations).clear());
    await transactionToPromise(transaction);
  }
}

export class InMemoryCacheRepository implements CacheRepository {
  private readonly entries = new Map<string, TranslationCacheEntity>();

  async get(id: string): Promise<TranslationCacheEntity | null> {
    const entity = this.entries.get(id);

    if (entity === undefined) {
      return null;
    }

    const updatedEntity = {
      ...entity,
      lastUsedAt: Date.now(),
      hitCount: entity.hitCount + 1,
    };
    this.entries.set(id, updatedEntity);

    return updatedEntity;
  }

  async put(entity: TranslationCacheEntity): Promise<void> {
    this.entries.set(entity.id, entity);
  }

  async clear(): Promise<void> {
    this.entries.clear();
  }
}
