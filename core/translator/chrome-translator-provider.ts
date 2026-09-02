import {
  TranslatorProviderError,
  type TranslateOptions,
  type TranslatorProvider,
} from './provider';
import type { TranslatorAvailability } from './types';

const PROVIDER_ID = 'chrome-translator';

function normalizeAvailability(value: string): TranslatorAvailability {
  switch (value) {
    case 'unsupported':
    case 'unavailable':
    case 'downloadable':
    case 'downloading':
    case 'available':
      return value;
    default:
      return 'unknown';
  }
}

function getTranslatorApi(): BuiltInAiTranslatorConstructor | undefined {
  if (!('Translator' in globalThis)) {
    return undefined;
  }

  return (globalThis as typeof globalThis & BuiltInAiGlobal).Translator;
}

function clampProgress(progress: number): number {
  return Math.min(1, Math.max(0, progress));
}

export class ChromeTranslatorProvider implements TranslatorProvider {
  readonly id = PROVIDER_ID;

  private translatorPromise: Promise<BuiltInAiTranslator> | null = null;
  private translatorPair: string | null = null;

  async availability(
    sourceLanguage: string,
    targetLanguage: string,
  ): Promise<TranslatorAvailability> {
    const translatorApi = getTranslatorApi();

    if (translatorApi === undefined) {
      return 'unsupported';
    }

    const availability = await translatorApi.availability({
      sourceLanguage,
      targetLanguage,
    });

    return normalizeAvailability(availability);
  }

  async translate(text: string, options: TranslateOptions): Promise<string> {
    let translator: BuiltInAiTranslator;

    try {
      translator = await this.getOrCreateTranslator(options);
    } catch (error: unknown) {
      throw new TranslatorProviderError('prepare', error);
    }

    options.onTranslating?.();

    try {
      if (options.signal === undefined) {
        return await translator.translate(text);
      }

      return await translator.translate(text, {
        signal: options.signal,
      });
    } catch (error: unknown) {
      throw new TranslatorProviderError('translate', error);
    }
  }

  destroy(): void {
    const translatorPromise = this.translatorPromise;
    this.translatorPromise = null;
    this.translatorPair = null;

    if (translatorPromise !== null) {
      void translatorPromise
        .then((translator) => {
          translator.destroy?.();
        })
        .catch(() => {
          // A failed creation has no instance to release.
        });
    }
  }

  private async getOrCreateTranslator(
    options: TranslateOptions,
  ): Promise<BuiltInAiTranslator> {
    const pair = `${options.sourceLanguage}|${options.targetLanguage}`;

    if (this.translatorPromise !== null && this.translatorPair === pair) {
      return this.translatorPromise;
    }

    if (this.translatorPromise !== null) {
      this.destroy();
    }

    const translatorApi = getTranslatorApi();

    if (translatorApi === undefined) {
      throw new Error('Translator API is not supported in this context');
    }

    const creationController = new AbortController();
    const abortCreation = (): void => {
      creationController.abort();
    };

    options.signal?.addEventListener('abort', abortCreation, { once: true });
    if (options.signal?.aborted === true) {
      creationController.abort();
    }

    const pendingTranslator = translatorApi.create({
      sourceLanguage: options.sourceLanguage,
      targetLanguage: options.targetLanguage,
      signal: creationController.signal,
      monitor: (monitor) => {
        monitor.addEventListener('downloadprogress', (event: Event) => {
          const progressEvent = event as ProgressEvent;
          if (
            typeof progressEvent.loaded === 'number' &&
            Number.isFinite(progressEvent.loaded)
          ) {
            options.onDownloadProgress?.(clampProgress(progressEvent.loaded));
          }
        });
      },
    });

    this.translatorPair = pair;
    this.translatorPromise = pendingTranslator.catch((error: unknown) => {
      this.translatorPromise = null;
      this.translatorPair = null;
      throw error;
    });

    try {
      return await this.translatorPromise;
    } finally {
      options.signal?.removeEventListener('abort', abortCreation);
    }
  }
}
