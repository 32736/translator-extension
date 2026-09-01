import type {
  SourceLanguage,
  TargetLanguage,
  TranslatorAvailability,
} from './types';

export interface TranslateOptions {
  sourceLanguage: SourceLanguage;
  targetLanguage: TargetLanguage;
  signal?: AbortSignal;
  onDownloadProgress?: (progress: number) => void;
}

export interface TranslatorProvider {
  readonly id: string;

  availability(
    sourceLanguage: string,
    targetLanguage: string,
  ): Promise<TranslatorAvailability>;

  translate(text: string, options: TranslateOptions): Promise<string>;
}
