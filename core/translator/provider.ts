import type {
  SourceLanguage,
  TargetLanguage,
  TranslatorAvailability,
} from './types';

export type TranslatorProviderFailurePhase = 'prepare' | 'translate';

export class TranslatorProviderError extends Error {
  readonly phase: TranslatorProviderFailurePhase;

  constructor(phase: TranslatorProviderFailurePhase, cause: unknown) {
    super(
      phase === 'prepare'
        ? 'Translator provider preparation failed'
        : 'Translator provider translation failed',
      { cause },
    );
    this.name = 'TranslatorProviderError';
    this.phase = phase;
  }
}

export interface TranslateOptions {
  sourceLanguage: SourceLanguage;
  targetLanguage: TargetLanguage;
  signal?: AbortSignal;
  onDownloadProgress?: (progress: number) => void;
  onTranslating?: () => void;
}

export interface TranslatorProvider {
  readonly id: string;

  destroy?(): void;

  availability(
    sourceLanguage: string,
    targetLanguage: string,
  ): Promise<TranslatorAvailability>;

  translate(text: string, options: TranslateOptions): Promise<string>;
}
