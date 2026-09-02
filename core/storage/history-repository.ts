import type { TranslationSource } from '../translator/translation-types';
import type { SourceLanguage, TargetLanguage } from '../translator/types';
import {
  openTranslatorDatabase,
  requestToPromise,
  STORE_NAMES,
  transactionToPromise,
} from './db';

export interface HistoryEntity {
  id: string;
  sourceText: string;
  translatedText: string;
  sourceLanguage: SourceLanguage;
  targetLanguage: TargetLanguage;
  source: TranslationSource;
  createdAt: number;
}

export interface HistoryRepository {
  save(entity: HistoryEntity): Promise<void>;
  list(limit?: number): Promise<HistoryEntity[]>;
  clear(): Promise<void>;
}

const HISTORY_LIMIT = 500;
const RECENT_DUPLICATE_WINDOW_MS = 5 * 60 * 1000;

export class IndexedDbHistoryRepository implements HistoryRepository {
  async save(entity: HistoryEntity): Promise<void> {
    const recent = await this.list(HISTORY_LIMIT);
    const duplicate = recent.find(
      (item) =>
        item.sourceText === entity.sourceText &&
        item.targetLanguage === entity.targetLanguage &&
        entity.createdAt - item.createdAt <= RECENT_DUPLICATE_WINDOW_MS,
    );
    const entityToSave = duplicate === undefined
      ? entity
      : { ...entity, id: duplicate.id };

    const database = await openTranslatorDatabase();
    const transaction = database.transaction(STORE_NAMES.history, 'readwrite');
    await requestToPromise(transaction.objectStore(STORE_NAMES.history).put(entityToSave));
    await transactionToPromise(transaction);
    await this.prune();
  }

  async list(limit = 30): Promise<HistoryEntity[]> {
    const database = await openTranslatorDatabase();
    const transaction = database.transaction(STORE_NAMES.history, 'readonly');
    const index = transaction
      .objectStore(STORE_NAMES.history)
      .index('createdAt');
    const entities = await new Promise<HistoryEntity[]>((resolve, reject) => {
      const results: HistoryEntity[] = [];
      const request = index.openCursor(null, 'prev');

      request.onsuccess = () => {
        const cursor = request.result;

        if (cursor === null || results.length >= limit) {
          resolve(results);
          return;
        }

        results.push(cursor.value as HistoryEntity);
        cursor.continue();
      };
      request.onerror = () => reject(request.error ?? new Error('History list failed'));
    });
    await transactionToPromise(transaction);

    return entities;
  }

  async clear(): Promise<void> {
    const database = await openTranslatorDatabase();
    const transaction = database.transaction(STORE_NAMES.history, 'readwrite');
    await requestToPromise(transaction.objectStore(STORE_NAMES.history).clear());
    await transactionToPromise(transaction);
  }

  private async prune(): Promise<void> {
    const overflow = await this.list(HISTORY_LIMIT + 1);

    if (overflow.length <= HISTORY_LIMIT) {
      return;
    }

    const database = await openTranslatorDatabase();
    const transaction = database.transaction(STORE_NAMES.history, 'readwrite');
    const store = transaction.objectStore(STORE_NAMES.history);

    for (const entity of overflow.slice(HISTORY_LIMIT)) {
      await requestToPromise(store.delete(entity.id));
    }

    await transactionToPromise(transaction);
  }
}
