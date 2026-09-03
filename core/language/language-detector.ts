import {
  isSupportedLanguage,
  SUPPORTED_LANGUAGES,
} from '../translator/languages';
import type { SupportedLanguage } from '../translator/types';

export interface DetectLanguageOptions {
  signal?: AbortSignal;
  onDownloadProgress?: (progress: number) => void;
}

export interface LanguageDetectionCandidate {
  language: SupportedLanguage;
  confidence: number;
}

export interface LanguageDetectionResult {
  language: SupportedLanguage | null;
  candidates: readonly LanguageDetectionCandidate[];
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

const SHORT_TEXT_MAX_CHARACTERS = 24;
const SHORT_TEXT_MAX_WORDS = 3;
const NORMAL_TEXT_MIN_CONFIDENCE = 0.55;
const SHORT_TEXT_MIN_CONFIDENCE = 0.4;
const NORMAL_TEXT_MIN_MARGIN = 0.1;
const SHORT_TEXT_MIN_MARGIN = 0.15;
const SHORT_TEXT_HIGH_CONFIDENCE = 0.65;

function isShortText(value: string): boolean {
  const words = value.match(/\S+/gu) ?? [];
  return (
    value.length <= SHORT_TEXT_MAX_CHARACTERS &&
    words.length <= SHORT_TEXT_MAX_WORDS
  );
}

function chooseLanguageCandidate(
  value: string,
  candidates: readonly LanguageDetectionCandidate[],
): SupportedLanguage | null {
  const topCandidate = candidates[0];
  if (topCandidate === undefined) {
    return null;
  }

  const shortText = isShortText(value);
  const minConfidence = shortText
    ? SHORT_TEXT_MIN_CONFIDENCE
    : NORMAL_TEXT_MIN_CONFIDENCE;

  if (topCandidate.confidence < minConfidence) {
    return null;
  }

  const secondCandidate = candidates[1];
  if (secondCandidate === undefined) {
    return topCandidate.language;
  }

  const margin = topCandidate.confidence - secondCandidate.confidence;
  if (
    shortText &&
    topCandidate.confidence < SHORT_TEXT_HIGH_CONFIDENCE &&
    margin < SHORT_TEXT_MIN_MARGIN
  ) {
    return null;
  }

  if (!shortText && margin < NORMAL_TEXT_MIN_MARGIN) {
    return null;
  }

  return topCandidate.language;
}

export function detectLanguageByScript(
  text: string,
): SupportedLanguage | null {
  const value = text.trim();
  const chineseCount = countMatches(value, /[\u3400-\u9fff]/g);
  const latinCount = countMatches(value, /[A-Za-z]/g);
  const japaneseCount = countMatches(value, /[\u3040-\u30ff]/g);
  const koreanCount = countMatches(value, /[\uac00-\ud7af]/g);
  const arabicCount = countMatches(value, /[\u0600-\u06ff]/g);
  const bengaliCount = countMatches(value, /[\u0980-\u09ff]/g);
  const hebrewCount = countMatches(value, /[\u0590-\u05ff]/g);
  const tamilCount = countMatches(value, /[\u0b80-\u0bff]/g);
  const teluguCount = countMatches(value, /[\u0c00-\u0c7f]/g);
  const kannadaCount = countMatches(value, /[\u0c80-\u0cff]/g);
  const greekCount = countMatches(value, /[\u0370-\u03ff]/g);
  const thaiCount = countMatches(value, /[\u0e00-\u0e7f]/g);
  const ukrainianCount = countMatches(value, /[іїєґ]/gi);
  const russianCount = countMatches(value, /[ёыэ]/gi);
  const vietnameseCount = countMatches(value, /[ăâđêôơư]/gi);
  const spanishCount = countMatches(value, /[¿¡ñáéíóú]/gi);
  const frenchCount = countMatches(value, /[àâæçéèêëîïôœùûüÿ]/gi);
  const germanCount = countMatches(value, /[äöüß]/gi);

  if (koreanCount > 0 && koreanCount >= japaneseCount) {
    return 'ko';
  }

  if (arabicCount > 0) {
    return 'ar';
  }

  if (hebrewCount > 0) {
    return 'he';
  }

  if (bengaliCount > 0) {
    return 'bn';
  }

  if (tamilCount > 0) {
    return 'ta';
  }

  if (teluguCount > 0) {
    return 'te';
  }

  if (kannadaCount > 0) {
    return 'kn';
  }

  if (greekCount > 0) {
    return 'el';
  }

  if (thaiCount > 0) {
    return 'th';
  }

  if (ukrainianCount > 0) {
    return 'uk';
  }

  if (russianCount > 0) {
    return 'ru';
  }

  if (vietnameseCount > 0) {
    return 'vi';
  }

  if (japaneseCount > 0 && japaneseCount > koreanCount) {
    return 'ja';
  }

  if (spanishCount > 0) {
    return 'es';
  }

  if (germanCount > 0) {
    return 'de';
  }

  if (frenchCount > 0) {
    return 'fr';
  }

  if (chineseCount === 0 && latinCount > 0) {
    return null;
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
    const result = await this.detectWithCandidates(text, options);
    return result.language;
  }

  async detectWithCandidates(
    text: string,
    options?: DetectLanguageOptions,
  ): Promise<LanguageDetectionResult> {
    if (options?.signal?.aborted === true) {
      throw createAbortError();
    }

    const value = text.trim();
    if (!value) {
      return { language: null, candidates: [] };
    }

    const scriptLanguage = detectLanguageByScript(value);

    if (scriptLanguage !== null) {
      return {
        language: scriptLanguage,
        candidates: [{ language: scriptLanguage, confidence: 1 }],
      };
    }

    const api = getLanguageDetectorApi();

    if (api === undefined) {
      return { language: null, candidates: [] };
    }

    try {
      const detector = await this.getOrCreateDetector(api, options);
      const results = await detector.detect(value, {
        signal: options?.signal,
      });
      const candidates = results
        .filter(
          (result) =>
            isSupportedLanguage(result.detectedLanguage) &&
            Number.isFinite(result.confidence),
        )
        .map((result) => ({
          language: result.detectedLanguage as SupportedLanguage,
          confidence: result.confidence,
        }))
        .sort((left, right) => right.confidence - left.confidence);

      return {
        language: chooseLanguageCandidate(value, candidates),
        candidates,
      };
    } catch (error: unknown) {
      if (Boolean(options?.signal?.aborted) || isAbortError(error)) {
        throw error;
      }

      return { language: null, candidates: [] };
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
      expectedInputLanguages: SUPPORTED_LANGUAGES.map(
        (language) => language.code,
      ),
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
