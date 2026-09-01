import type { CacheRepository } from '../storage/cache-repository';
import { containsMostlyChinese } from '../language/classify';
import type { HistoryRepository } from '../storage/history-repository';
import type { TranslatorProvider } from './provider';
import type {
  TranslationError,
  TranslationRequest,
  TranslationResult,
} from './translation-types';

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

async function createCacheKey(text: string): Promise<string> {
  const keySource = `en|zh|chrome-translator|${text}`;
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
  if (
    signal?.aborted === true ||
    (error instanceof DOMException && error.name === 'AbortError')
  ) {
    return {
      code: 'ABORTED',
      message: '翻译已取消。',
      cause: error,
    };
  }

  return {
    code: 'TRANSLATION_FAILED',
    message: '翻译失败，请重试。',
    cause: error,
  };
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
        message: '请输入要翻译的英文。',
      });
    }

    if (containsMostlyChinese(normalizedText)) {
      throw new TranslationServiceError({
        code: 'INVALID_INPUT',
        message: 'V0.1 当前仅支持英文 → 简体中文。',
      });
    }

    if (options?.signal?.aborted === true) {
      throw new TranslationServiceError({
        code: 'ABORTED',
        message: '翻译已取消。',
      });
    }

    const startedAt = performance.now();
    const cacheId = await createCacheKey(normalizedText);
    const cachedEntity = await this.cacheRepository.get(cacheId);

    if (cachedEntity !== null) {
      await this.historyRepository?.save({
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
        provider: 'chrome-translator',
        cached: true,
        durationMs: Math.round(performance.now() - startedAt),
        createdAt: Date.now(),
      };
    }

    let availability: string | null = null;

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
          message: '当前设备无法使用英文 → 简体中文本地翻译模型。',
        });
      }

      options?.onTranslating?.();

      const translatedText = await this.provider.translate(normalizedText, {
        sourceLanguage: request.sourceLanguage,
        targetLanguage: request.targetLanguage,
        signal: options?.signal,
        onDownloadProgress: options?.onDownloadProgress,
      });

      await this.cacheRepository.put({
        id: cacheId,
        sourceText: normalizedText,
        translatedText,
        sourceLanguage: request.sourceLanguage,
        targetLanguage: request.targetLanguage,
        provider: this.provider.id,
        createdAt: Date.now(),
        lastUsedAt: Date.now(),
        hitCount: 0,
      });

      await this.historyRepository?.save({
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
        provider: 'chrome-translator',
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
