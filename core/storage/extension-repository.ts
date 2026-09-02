import type {
  RuntimeMessage,
  RuntimeResponse,
} from '../messaging/messages';
import {
  isRuntimeResponse,
} from '../messaging/messages';
import type {
  CacheRepository,
  TranslationCacheEntity,
} from './cache-repository';
import type {
  HistoryEntity,
  HistoryRepository,
} from './history-repository';

type SuccessfulRuntimeResponse = Extract<RuntimeResponse, { ok: true }>;

async function sendStorageRequest(
  message: RuntimeMessage,
): Promise<SuccessfulRuntimeResponse> {
  let response: unknown;

  try {
    response = await chrome.runtime.sendMessage(message);
  } catch (error: unknown) {
    throw new Error('扩展本地存储暂时不可用', { cause: error });
  }

  if (!isRuntimeResponse(response)) {
    throw new Error('扩展本地存储返回了无效响应');
  }

  if (!response.ok) {
    throw new Error(response.message);
  }

  return response;
}

export class ExtensionCacheRepository implements CacheRepository {
  async get(id: string): Promise<TranslationCacheEntity | null> {
    const response = await sendStorageRequest({
      type: 'GET_TRANSLATION_CACHE',
      payload: { id },
    });

    if (response.kind !== 'cache') {
      throw new Error('扩展本地缓存返回了无效响应');
    }

    return response.entity;
  }

  async put(entity: TranslationCacheEntity): Promise<void> {
    await sendStorageRequest({
      type: 'SAVE_TRANSLATION_CACHE',
      payload: { entity },
    });
  }

  async clear(): Promise<void> {
    await sendStorageRequest({ type: 'CLEAR_TRANSLATION_CACHE' });
  }
}

export class ExtensionHistoryRepository implements HistoryRepository {
  async save(entity: HistoryEntity): Promise<void> {
    await sendStorageRequest({
      type: 'SAVE_TRANSLATION_HISTORY',
      payload: { entity },
    });
  }

  async remove(id: string): Promise<void> {
    await sendStorageRequest({
      type: 'DELETE_TRANSLATION_HISTORY',
      payload: { id },
    });
  }

  async list(limit = 30): Promise<HistoryEntity[]> {
    const response = await sendStorageRequest({
      type: 'GET_TRANSLATION_HISTORY',
      payload: { limit },
    });

    if (response.kind !== 'history') {
      throw new Error('扩展本地历史返回了无效响应');
    }

    return response.entities;
  }

  async clear(): Promise<void> {
    await sendStorageRequest({ type: 'CLEAR_TRANSLATION_HISTORY' });
  }
}
