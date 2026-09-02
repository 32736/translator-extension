import {
  isSupportedLanguage,
} from '../translator/languages';
import type { SupportedLanguage } from '../translator/types';

export interface DetectLanguageOptions {
  signal?: AbortSignal;
  onDownloadProgress?: (progress: number) => void;
}

function createAbortError(): DOMException {
  return new DOMException('The operation was aborted.', 'AbortError');
}

function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === 'AbortError') ||
    (error instanceof Error && error.name === 'AbortError')
  );
}

function getLanguageDetectorApi():
  | BuiltInAiLanguageDetectorConstructor
  | undefined {
  if (!('LanguageDetector' in globalThis)) {
    return undefined;
  }

  return (globalThis as typeof globalThis & BuiltInAiGlobal).LanguageDetector;
}

function countMatches(text: string, pattern: RegExp): number {
  return text.match(pattern)?.length ?? 0;
}

export function detectLanguageByScript(
  text: string,
): SupportedLanguage | null {
  const value = text.trim();
  const chineseCount = countMatches(value, /[\u3400-\u9fff]/g);
  const latinCount = countMatches(value, /[A-Za-z]/g);
  const japaneseCount = countMatches(value, /[\u3040-\u30ff]/g);
  const koreanCount = countMatches(value, /[\uac00-\ud7af]/g);

  if (koreanCount > 0 && koreanCount >= japaneseCount) {
    return 'ko';
  }

  if (japaneseCount > 0 && japaneseCount > koreanCount) {
    return 'ja';
  }

  if (chineseCount === 0 && latinCount > 0) {
    return 'en';
  }

  if (latinCount === 0 && chineseCount > 0) {
    return null;
  }

  if (chineseCount >= latinCount + 2) {
    return 'zh';
  }

  if (latinCount >= chineseCount + 2) {
    return 'en';
  }

  return null;
}

export class ChromeLanguageDetector {
  private detectorPromise: Promise<BuiltInAiLanguageDetector> | null = null;

  async detect(
    text: string,
    options?: DetectLanguageOptions,
  ): Promise<SupportedLanguage | null> {
    if (options?.signal?.aborted === true) {
      throw createAbortError();
    }

    const scriptLanguage = detectLanguageByScript(text);

    if (scriptLanguage !== null) {
      return scriptLanguage;
    }

    const api = getLanguageDetectorApi();

    if (api === undefined) {
      return null;
    }

    try {
      const detector = await this.getOrCreateDetector(api, options);
      const results = await detector.detect(text, {
        signal: options?.signal,
      });
      const match = results.find(
        (result) =>
          isSupportedLanguage(result.detectedLanguage) &&
          Number.isFinite(result.confidence) &&
          result.confidence >= 0.55,
      );

      return match !== undefined && isSupportedLanguage(match.detectedLanguage)
        ? match.detectedLanguage
        : null;
    } catch (error: unknown) {
      if (Boolean(options?.signal?.aborted) || isAbortError(error)) {
        throw error;
      }

      return null;
    }
  }

  destroy(): void {
    const detectorPromise = this.detectorPromise;
    this.detectorPromise = null;

    if (detectorPromise !== null) {
      void detectorPromise
        .then((detector) => {
          detector.destroy?.();
        })
        .catch(() => {
          // A failed creation has no instance to release.
        });
    }
  }

  private async getOrCreateDetector(
    api: BuiltInAiLanguageDetectorConstructor,
    options?: DetectLanguageOptions,
  ): Promise<BuiltInAiLanguageDetector> {
    if (this.detectorPromise !== null) {
      return awaitWithAbort(this.detectorPromise, options?.signal);
    }

    const creationController = new AbortController();
    const abortCreation = (): void => {
      creationController.abort();
    };
    options?.signal?.addEventListener('abort', abortCreation, { once: true });

    const pendingDetector = api.create({
      expectedInputLanguages: ['en', 'zh', 'ja', 'ko'],
      signal: creationController.signal,
      monitor: (monitor) => {
        monitor.addEventListener('downloadprogress', (event: Event) => {
          const progressEvent = event as ProgressEvent;

          if (
            typeof progressEvent.loaded === 'number' &&
            Number.isFinite(progressEvent.loaded)
          ) {
            options?.onDownloadProgress?.(
              Math.min(1, Math.max(0, progressEvent.loaded)),
            );
          }
        });
      },
    });

    this.detectorPromise = pendingDetector.catch((error: unknown) => {
      this.detectorPromise = null;
      throw error;
    });

    try {
      return await awaitWithAbort(this.detectorPromise, options?.signal);
    } finally {
      options?.signal?.removeEventListener('abort', abortCreation);
    }
  }
}

async function awaitWithAbort<T>(
  promise: Promise<T>,
  signal?: AbortSignal,
): Promise<T> {
  if (signal === undefined) {
    return promise;
  }

  if (signal.aborted) {
    throw createAbortError();
  }

  return new Promise<T>((resolve, reject) => {
    const onAbort = (): void => {
      cleanup();
      reject(createAbortError());
    };
    const cleanup = (): void => {
      signal.removeEventListener('abort', onAbort);
    };

    signal.addEventListener('abort', onAbort, { once: true });
    void promise.then(
      (value) => {
        cleanup();
        resolve(value);
      },
      (error: unknown) => {
        cleanup();
        reject(error);
      },
    );
  });
}
