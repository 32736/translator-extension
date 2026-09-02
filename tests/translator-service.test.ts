import { describe, expect, it, vi } from 'vitest';
import type {
  CacheRepository,
  TranslationCacheEntity,
} from '../core/storage/cache-repository';
import type {
  HistoryEntity,
  HistoryRepository,
} from '../core/storage/history-repository';
import {
  ChromeTranslatorProvider,
} from '../core/translator/chrome-translator-provider';
import {
  TranslatorProviderError,
  type TranslateOptions,
  type TranslatorProvider,
} from '../core/translator/provider';
import type { TranslatorAvailability } from '../core/translator/types';
import type {
  TranslationRequest,
} from '../core/translator/translation-types';
import {
  TranslationServiceError,
  TranslatorService,
} from '../core/translator/translator-service';

class MemoryCacheRepository implements CacheRepository {
  readonly entries = new Map<string, TranslationCacheEntity>();

  async get(id: string): Promise<TranslationCacheEntity | null> {
    return this.entries.get(id) ?? null;
  }

  async put(entity: TranslationCacheEntity): Promise<void> {
    this.entries.set(entity.id, entity);
  }

  async clear(): Promise<void> {
    this.entries.clear();
  }
}

class MemoryHistoryRepository implements HistoryRepository {
  readonly entries: HistoryEntity[] = [];

  async save(entity: HistoryEntity): Promise<void> {
    this.entries.push(entity);
  }

  async list(): Promise<HistoryEntity[]> {
    return [...this.entries];
  }

  async clear(): Promise<void> {
    this.entries.length = 0;
  }
}

class StubProvider implements TranslatorProvider {
  calls = 0;

  constructor(
    private readonly availabilityResult = 'available',
    private readonly translatedText = 'translated',
    readonly id = 'test-provider',
  ) {}

  async availability(): Promise<TranslatorAvailability> {
    return this.availabilityResult as TranslatorAvailability;
  }

  async translate(
    _text: string,
    options: TranslateOptions,
  ): Promise<string> {
    this.calls += 1;
    options.onTranslating?.();
    return this.translatedText;
  }
}

function createRequest(text: string, id = 'request-1'): TranslationRequest {
  return {
    id,
    text,
    sourceLanguage: 'en',
    targetLanguage: 'zh',
    source: 'window',
    createdAt: Date.now(),
  };
}

function createService(
  provider: TranslatorProvider,
  cache = new MemoryCacheRepository(),
  history = new MemoryHistoryRepository(),
): {
  service: TranslatorService;
  cache: MemoryCacheRepository;
  history: MemoryHistoryRepository;
} {
  return {
    service: new TranslatorService(provider, cache, history),
    cache,
    history,
  };
}

describe('TranslatorService', () => {
  it('normalizes input and persists a translation', async () => {
    const provider = new StubProvider('available', '译文');
    const { service, history } = createService(provider);

    const result = await service.translate(createRequest('  hello\r\n'));

    expect(result.sourceText).toBe('hello');
    expect(result.translatedText).toBe('译文');
    expect(result.cached).toBe(false);
    expect(history.entries).toHaveLength(1);
  });

  it('supports Chinese to English translation', async () => {
    const provider = new StubProvider('available', 'hello');
    const { service, history } = createService(provider);
    const request = {
      ...createRequest('你好'),
      sourceLanguage: 'zh' as const,
      targetLanguage: 'en' as const,
    };

    const result = await service.translate(request);

    expect(result.translatedText).toBe('hello');
    expect(result.sourceLanguage).toBe('zh');
    expect(result.targetLanguage).toBe('en');
    expect(history.entries[0]?.sourceLanguage).toBe('zh');
  });

  it('supports Japanese and Korean to Chinese translation', async () => {
    const provider = new StubProvider('available', '你好');
    const { service } = createService(provider);

    const japaneseResult = await service.translate({
      ...createRequest('これは日本語です', 'request-ja'),
      sourceLanguage: 'ja',
      targetLanguage: 'zh',
    });
    const koreanResult = await service.translate({
      ...createRequest('한국어 문장입니다', 'request-ko'),
      sourceLanguage: 'ko',
      targetLanguage: 'zh',
    });

    expect(japaneseResult.translatedText).toBe('你好');
    expect(koreanResult.translatedText).toBe('你好');
    expect(provider.calls).toBe(2);
  });

  it('rejects translation pairs outside the current V0.3 scope', async () => {
    const { service } = createService(new StubProvider());

    await expect(
      service.translate({
        ...createRequest('hello'),
        sourceLanguage: 'en',
        targetLanguage: 'ja',
      }),
    ).rejects.toMatchObject({
      details: { code: 'PAIR_UNAVAILABLE' },
    });
  });

  it('rejects identical source and target languages', async () => {
    const { service } = createService(new StubProvider());
    const request = {
      ...createRequest('hello'),
      sourceLanguage: 'en' as const,
      targetLanguage: 'en' as const,
    };

    await expect(service.translate(request)).rejects.toMatchObject({
      details: { code: 'INVALID_INPUT' },
    });
  });

  it('uses the cache and still records history', async () => {
    const provider = new StubProvider('available', '译文');
    const { service, history } = createService(provider);

    await service.translate(createRequest('hello', 'request-1'));
    const result = await service.translate(createRequest('hello', 'request-2'));

    expect(result.cached).toBe(true);
    expect(provider.calls).toBe(1);
    expect(history.entries).toHaveLength(2);
  });

  it('rejects empty and mostly Chinese input', async () => {
    const { service } = createService(new StubProvider());

    await expect(service.translate(createRequest('   '))).rejects.toMatchObject({
      details: { code: 'INVALID_INPUT' },
    });
    await expect(service.translate(createRequest('这是中文'))).rejects.toMatchObject({
      details: { code: 'INVALID_INPUT' },
    });
  });

  it('maps unavailable pairs and cancellation to stable errors', async () => {
    const unavailable = createService(new StubProvider('unavailable')).service;
    await expect(unavailable.translate(createRequest('hello'))).rejects.toMatchObject({
      details: { code: 'PAIR_UNAVAILABLE' },
    });

    const controller = new AbortController();
    controller.abort();
    const cancellable = createService(new StubProvider()).service;
    await expect(
      cancellable.translate(createRequest('hello'), {
        signal: controller.signal,
      }),
    ).rejects.toMatchObject({ details: { code: 'ABORTED' } });
  });

  it('distinguishes model creation failures from translation failures', async () => {
    const modelProvider: TranslatorProvider = {
      id: 'model-provider',
      availability: async () => 'downloadable',
      translate: async () => {
        throw new TranslatorProviderError('prepare', new Error('download failed'));
      },
    };
    const modelService = createService(modelProvider).service;

    await expect(modelService.translate(createRequest('hello'))).rejects.toMatchObject({
      details: { code: 'MODEL_DOWNLOAD_FAILED' },
    });

    const translationProvider: TranslatorProvider = {
      id: 'translation-provider',
      availability: async () => 'downloadable',
      translate: async () => {
        throw new TranslatorProviderError('translate', new Error('failed'));
      },
    };
    const translationService = createService(translationProvider).service;

    await expect(
      translationService.translate(createRequest('hello')),
    ).rejects.toMatchObject({
      details: { code: 'TRANSLATION_FAILED' },
    });
  });
});

describe('ChromeTranslatorProvider', () => {
  it('reports translating only after Translator creation resolves', async () => {
    let resolveCreate: ((translator: BuiltInAiTranslator) => void) | undefined;
    const translator = {
      translate: vi.fn().mockResolvedValue('translated'),
    } satisfies BuiltInAiTranslator;
    const api = {
      availability: vi.fn().mockResolvedValue('available'),
      create: vi.fn(
        () =>
          new Promise<BuiltInAiTranslator>((resolve) => {
            resolveCreate = resolve;
          }),
      ),
    } satisfies BuiltInAiTranslatorConstructor;
    vi.stubGlobal('Translator', api);

    const onTranslating = vi.fn();
    const translation = new ChromeTranslatorProvider().translate('hello', {
      sourceLanguage: 'en',
      targetLanguage: 'zh',
      onTranslating,
    });

    expect(onTranslating).not.toHaveBeenCalled();
    resolveCreate?.(translator);
    await expect(translation).resolves.toBe('translated');
    expect(onTranslating).toHaveBeenCalledOnce();

    vi.unstubAllGlobals();
  });
});

describe('TranslationServiceError', () => {
  it('is an Error with structured details', () => {
    const error = new TranslationServiceError({
      code: 'INVALID_INPUT',
      message: 'invalid',
    });

    expect(error).toBeInstanceOf(Error);
    expect(error.details.code).toBe('INVALID_INPUT');
  });
});
