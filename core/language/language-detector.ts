import {
  isSupportedLanguage,
} from '../translator/languages';
import type { SupportedLanguage } from '../translator/types';

export interface DetectLanguageOptions {
  onDownloadProgress?: (progress: number) => void;
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
    return 'zh';
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
      const results = await detector.detect(text);
      const match = results.find(
        (result) =>
          isSupportedLanguage(result.detectedLanguage) &&
          Number.isFinite(result.confidence) &&
          result.confidence >= 0.55,
      );

      return match !== undefined && isSupportedLanguage(match.detectedLanguage)
        ? match.detectedLanguage
        : null;
    } catch {
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
      return this.detectorPromise;
    }

    const pendingDetector = api.create({
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

    return this.detectorPromise;
  }
}
