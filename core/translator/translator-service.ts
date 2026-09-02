import type {
  CacheRepository,
  TranslationCacheEntity,
} from '../storage/cache-repository';
import { containsMostlyChinese } from '../language/classify';
import { detectLanguageByScript } from '../language/language-detector';
import {
  getTranslationPairLabel,
  isSupportedTranslationPair,
  languageLabel,
} from './languages';
import type { HistoryRepository } from '../storage/history-repository';
import {
  TranslatorProviderError,
  type TranslatorProvider,
} from './provider';
import type {
  TranslationError,
  TranslationRequest,
  TranslationResult,
} from './translation-types';
import type { TranslatorAvailability } from './types';

export class TranslationServiceError extends Error {
  readonly details: TranslationError;

  constructor(details: TranslationError) {
    super(details.message);
    this.name = 'TranslationServiceError';
    this.details = details;
  }
}

export function normalizeText(input: string): string {
  return input.replace(/\r\n/g, '\n').trim();
}

async function createCacheKey(
  text: string,
  sourceLanguage: string,
  targetLanguage: string,
): Promise<string> {
  const keySource = `${sourceLanguage}|${targetLanguage}|chrome-translator|${text}`;
  const encodedKey = new TextEncoder().encode(keySource);
  const digest = await crypto.subtle.digest('SHA-256', encodedKey);

  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
}

function toErrorDetails(
  error: unknown,
  signal: AbortSignal | undefined,
): TranslationError {
  const cause =
    error instanceof TranslatorProviderError ? error.cause : error;

  if (
    signal?.aborted === true ||
    (cause instanceof DOMException && cause.name === 'AbortError') ||
    (cause instanceof Error && cause.name === 'AbortError')
  ) {
    return {
      code: 'ABORTED',
      message: '翻译已取消。',
      cause,
    };
  }

  return {
    code: 'TRANSLATION_FAILED',
    message: '翻译失败，请重试。',
    cause,
  };
}

async function getCacheSafely(
  repository: CacheRepository,
  id: string,
): Promise<TranslationCacheEntity | null> {
  try {
    return await repository.get(id);
  } catch {
    return null;
  }
}

async function putCacheSafely(
  repository: CacheRepository,
  entity: TranslationCacheEntity,
): Promise<void> {
  try {
    await repository.put(entity);
  } catch {
    // A storage failure should not discard an otherwise valid translation.
  }
}

async function saveHistorySafely(
  repository: HistoryRepository | undefined,
  entity: Parameters<HistoryRepository['save']>[0],
): Promise<void> {
  try {
    await repository?.save(entity);
  } catch {
    // A storage failure should not discard an otherwise valid translation.
  }
}

export class TranslatorService {
  constructor(
    private readonly provider: TranslatorProvider,
    private readonly cacheRepository: CacheRepository,
    private readonly historyRepository?: HistoryRepository,
  ) {}

  async translate(
    request: TranslationRequest,
    options?: {
      signal?: AbortSignal;
      onDownloadProgress?: (progress: number) => void;
      onTranslating?: () => void;
    },
  ): Promise<TranslationResult> {
    const normalizedText = normalizeText(request.text);

    if (!normalizedText) {
      throw new TranslationServiceError({
        code: 'INVALID_INPUT',
        message: '请输入要翻译的内容。',
      });
    }

    if (request.sourceLanguage === request.targetLanguage) {
      throw new TranslationServiceError({
        code: 'INVALID_INPUT',
        message: '源语言和目标语言不能相同。',
      });
    }

    if (
      !isSupportedTranslationPair(
        request.sourceLanguage,
        request.targetLanguage,
      )
    ) {
      throw new TranslationServiceError({
        code: 'PAIR_UNAVAILABLE',
        message: `当前版本暂不支持${getTranslationPairLabel(request.sourceLanguage, request.targetLanguage)}。`,
      });
    }

    if (
      request.sourceLanguage === 'en' &&
      containsMostlyChinese(normalizedText)
    ) {
      throw new TranslationServiceError({
        code: 'INVALID_INPUT',
        message: '当前版本暂不支持将中文作为英文输入。',
      });
    }

    const detectedLanguage = detectLanguageByScript(normalizedText);

    if (
      detectedLanguage !== null &&
      detectedLanguage !== request.sourceLanguage
    ) {
      throw new TranslationServiceError({
        code: 'INVALID_INPUT',
        message: `当前方向为 ${getTranslationPairLabel(request.sourceLanguage, request.targetLanguage)}，请输入${languageLabel(request.sourceLanguage)}内容。`,
      });
    }

    if (options?.signal?.aborted === true) {
      throw new TranslationServiceError({
        code: 'ABORTED',
        message: '翻译已取消。',
      });
    }

    const startedAt = performance.now();
    const cacheId = await createCacheKey(
      normalizedText,
      request.sourceLanguage,
      request.targetLanguage,
    );
    const cachedEntity = await getCacheSafely(this.cacheRepository, cacheId);

    if (cachedEntity !== null) {
      await saveHistorySafely(this.historyRepository, {
        id: request.id,
        sourceText: cachedEntity.sourceText,
        translatedText: cachedEntity.translatedText,
        sourceLanguage: request.sourceLanguage,
        targetLanguage: request.targetLanguage,
        source: request.source,
        createdAt: request.createdAt,
      });

      return {
        requestId: request.id,
        sourceText: cachedEntity.sourceText,
        translatedText: cachedEntity.translatedText,
        sourceLanguage: request.sourceLanguage,
        targetLanguage: request.targetLanguage,
        cached: true,
        durationMs: Math.round(performance.now() - startedAt),
        createdAt: Date.now(),
      };
    }

    let availability: TranslatorAvailability | null = null;

    try {
      availability = await this.provider.availability(
        request.sourceLanguage,
        request.targetLanguage,
      );

      if (availability === 'unsupported') {
        throw new TranslationServiceError({
          code: 'API_UNSUPPORTED',
          message: '当前浏览器环境暂不支持 Translator API。',
        });
      }

      if (availability === 'unavailable') {
        throw new TranslationServiceError({
          code: 'PAIR_UNAVAILABLE',
          message: `当前设备无法使用${getTranslationPairLabel(request.sourceLanguage, request.targetLanguage)}本地翻译模型。`,
        });
      }

      const translatedText = await this.provider.translate(normalizedText, {
        sourceLanguage: request.sourceLanguage,
        targetLanguage: request.targetLanguage,
        signal: options?.signal,
        onDownloadProgress: options?.onDownloadProgress,
        onTranslating: options?.onTranslating,
      });

      await putCacheSafely(this.cacheRepository, {
        id: cacheId,
        sourceText: normalizedText,
        translatedText,
        sourceLanguage: request.sourceLanguage,
        targetLanguage: request.targetLanguage,
        createdAt: Date.now(),
        lastUsedAt: Date.now(),
        hitCount: 0,
      });

      await saveHistorySafely(this.historyRepository, {
        id: request.id,
        sourceText: normalizedText,
        translatedText,
        sourceLanguage: request.sourceLanguage,
        targetLanguage: request.targetLanguage,
        source: request.source,
        createdAt: request.createdAt,
      });

      return {
        requestId: request.id,
        sourceText: normalizedText,
        translatedText,
        sourceLanguage: request.sourceLanguage,
        targetLanguage: request.targetLanguage,
        cached: false,
        durationMs: Math.round(performance.now() - startedAt),
        createdAt: Date.now(),
      };
    } catch (error: unknown) {
      if (error instanceof TranslationServiceError) {
        throw error;
      }

      const details = toErrorDetails(error, options?.signal);

      if (
        details.code === 'TRANSLATION_FAILED' &&
        error instanceof TranslatorProviderError &&
        error.phase === 'prepare' &&
        (availability === 'downloadable' || availability === 'downloading')
      ) {
        throw new TranslationServiceError({
          ...details,
          code: 'MODEL_DOWNLOAD_FAILED',
          message: '翻译模型下载失败。',
        });
      }

      throw new TranslationServiceError(details);
    }
  }
}
