import { describe, expect, it } from 'vitest';
import {
  isRuntimeMessage,
  isRuntimeResponse,
} from '../core/messaging/messages';
import { createSelectionTranslationMessage } from '../core/messaging/selection-handoff';

const cacheEntity = {
  id: 'cache-id',
  sourceText: 'hello',
  translatedText: '你好',
  sourceLanguage: 'en',
  targetLanguage: 'zh',
  createdAt: 1,
  lastUsedAt: 1,
  hitCount: 0,
};

const historyEntity = {
  id: 'history-id',
  sourceText: 'hello',
  translatedText: '你好',
  sourceLanguage: 'en',
  targetLanguage: 'zh',
  source: 'selection' as const,
  createdAt: 1,
};

describe('runtime message validation', () => {
  it('accepts valid translation and storage messages', () => {
    expect(
      isRuntimeMessage({
        type: 'TRANSLATE_IN_WINDOW',
        payload: { text: 'hello', source: 'selection' },
      }),
    ).toBe(true);
    expect(
      isRuntimeMessage({
        type: 'SAVE_TRANSLATION_CACHE',
        payload: { entity: cacheEntity },
      }),
    ).toBe(true);
    expect(
      isRuntimeMessage({
        type: 'SAVE_TRANSLATION_HISTORY',
        payload: { entity: historyEntity },
      }),
    ).toBe(true);
    expect(
      isRuntimeMessage({
        type: 'DELETE_TRANSLATION_HISTORY',
        payload: { id: 'history-id' },
      }),
    ).toBe(true);
  });

  it('rejects malformed or unsupported messages', () => {
    expect(isRuntimeMessage(null)).toBe(false);
    expect(isRuntimeMessage({ type: 'UNKNOWN' })).toBe(false);
    expect(
      isRuntimeMessage({
        type: 'GET_TRANSLATION_HISTORY',
        payload: { limit: 1.5 },
      }),
    ).toBe(false);
    expect(
      isRuntimeMessage({
        type: 'TRANSLATE_IN_WINDOW',
        payload: { text: 'hello', source: 'invalid' },
      }),
    ).toBe(false);
    expect(
      isRuntimeMessage({
        type: 'TRANSLATE_IN_WINDOW',
        payload: { text: '   ', source: 'selection' },
      }),
    ).toBe(false);
  });
});

describe('selection handoff', () => {
  it('creates a normalized message for short selections', () => {
    expect(createSelectionTranslationMessage('  hello  ', false)).toEqual({
      type: 'TRANSLATE_IN_WINDOW',
      payload: { text: 'hello', source: 'selection' },
    });
  });

  it('does not hand off empty or overlong selections', () => {
    expect(createSelectionTranslationMessage('   ', false)).toBeNull();
    expect(createSelectionTranslationMessage('hello', true)).toBeNull();
  });
});

describe('runtime response validation', () => {
  it('accepts typed success and error responses', () => {
    expect(isRuntimeResponse({ ok: true, kind: 'ack' })).toBe(true);
    expect(
      isRuntimeResponse({ ok: true, kind: 'cache', entity: cacheEntity }),
    ).toBe(true);
    expect(
      isRuntimeResponse({
        ok: true,
        kind: 'history',
        entities: [historyEntity],
      }),
    ).toBe(true);
    expect(isRuntimeResponse({ ok: false, message: 'failed' })).toBe(true);
    expect(isRuntimeResponse({ ok: true, kind: 'cache', entity: 'bad' })).toBe(
      false,
    );
  });
});
