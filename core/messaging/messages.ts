import type { TranslationCacheEntity } from '../storage/cache-repository';
import type { HistoryEntity } from '../storage/history-repository';
import type { TranslationSource } from '../translator/translation-types';

type ExternalTranslationSource = Exclude<TranslationSource, 'window'>;

export type RuntimeMessage =
  | {
      type: 'OPEN_TRANSLATOR';
    }
  | {
      type: 'TRANSLATE_IN_WINDOW';
      payload: {
        text: string;
        source: ExternalTranslationSource;
      };
    }
  | {
      type: 'TRANSLATOR_WINDOW_READY';
    }
  | {
      type: 'GET_TRANSLATION_CACHE';
      payload: { id: string };
    }
  | {
      type: 'SAVE_TRANSLATION_CACHE';
      payload: { entity: TranslationCacheEntity };
    }
  | {
      type: 'CLEAR_TRANSLATION_CACHE';
    }
  | {
      type: 'SAVE_TRANSLATION_HISTORY';
      payload: { entity: HistoryEntity };
    }
  | {
      type: 'DELETE_TRANSLATION_HISTORY';
      payload: { id: string };
    }
  | {
      type: 'GET_TRANSLATION_HISTORY';
      payload: { limit?: number };
    }
  | {
      type: 'CLEAR_TRANSLATION_HISTORY';
    };

export type RuntimeResponse =
  | {
      ok: true;
      kind: 'ack';
    }
  | {
      ok: true;
      kind: 'cache';
      entity: TranslationCacheEntity | null;
    }
  | {
      ok: true;
      kind: 'history';
      entities: HistoryEntity[];
    }
  | {
      ok: false;
      message: string;
    };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isTranslationSource(value: unknown): value is ExternalTranslationSource {
  return value === 'selection' || value === 'context-menu';
}

function isTranslationCacheEntity(value: unknown): value is TranslationCacheEntity {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === 'string' &&
    typeof value.sourceText === 'string' &&
    typeof value.translatedText === 'string' &&
    typeof value.sourceLanguage === 'string' &&
    typeof value.targetLanguage === 'string' &&
    isFiniteNumber(value.createdAt) &&
    isFiniteNumber(value.lastUsedAt) &&
    isFiniteNumber(value.hitCount) &&
    value.hitCount >= 0
  );
}

function isHistoryEntity(value: unknown): value is HistoryEntity {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === 'string' &&
    typeof value.sourceText === 'string' &&
    typeof value.translatedText === 'string' &&
    typeof value.sourceLanguage === 'string' &&
    typeof value.targetLanguage === 'string' &&
    (value.source === 'window' || isTranslationSource(value.source)) &&
    isFiniteNumber(value.createdAt)
  );
}

export function isRuntimeMessage(value: unknown): value is RuntimeMessage {
  if (!isRecord(value) || typeof value.type !== 'string') {
    return false;
  }

  switch (value.type) {
    case 'OPEN_TRANSLATOR':
    case 'TRANSLATOR_WINDOW_READY':
    case 'CLEAR_TRANSLATION_CACHE':
    case 'CLEAR_TRANSLATION_HISTORY':
      return true;
    case 'TRANSLATE_IN_WINDOW':
      return (
        isRecord(value.payload) &&
        typeof value.payload.text === 'string' &&
        value.payload.text.trim().length > 0 &&
        isTranslationSource(value.payload.source)
      );
    case 'GET_TRANSLATION_CACHE':
      return (
        isRecord(value.payload) &&
        typeof value.payload.id === 'string' &&
        value.payload.id.length > 0
      );
    case 'SAVE_TRANSLATION_CACHE':
      return (
        isRecord(value.payload) &&
        isTranslationCacheEntity(value.payload.entity)
      );
    case 'SAVE_TRANSLATION_HISTORY':
      return (
        isRecord(value.payload) &&
        isHistoryEntity(value.payload.entity)
      );
    case 'DELETE_TRANSLATION_HISTORY':
      return (
        isRecord(value.payload) &&
        typeof value.payload.id === 'string' &&
        value.payload.id.length > 0
      );
    case 'GET_TRANSLATION_HISTORY':
      return (
        isRecord(value.payload) &&
        (value.payload.limit === undefined ||
          (typeof value.payload.limit === 'number' &&
            Number.isInteger(value.payload.limit) &&
            value.payload.limit >= 0))
      );
    default:
      return false;
  }
}

export function isRuntimeResponse(value: unknown): value is RuntimeResponse {
  if (!isRecord(value) || typeof value.ok !== 'boolean') {
    return false;
  }

  if (value.ok === false) {
    return typeof value.message === 'string';
  }

  if (value.kind === 'ack') {
    return true;
  }

  if (value.kind === 'cache') {
    return value.entity === null || isTranslationCacheEntity(value.entity);
  }

  return (
    value.kind === 'history' &&
    Array.isArray(value.entities) &&
    value.entities.every((entity) => isHistoryEntity(entity))
  );
}
