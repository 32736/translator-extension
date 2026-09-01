import type { SourceLanguage, TargetLanguage } from './types';

export type TranslationSource = 'window' | 'selection' | 'context-menu';

export interface TranslationRequest {
  id: string;
  text: string;
  sourceLanguage: SourceLanguage;
  targetLanguage: TargetLanguage;
  source: TranslationSource;
  createdAt: number;
}

export interface TranslationResult {
  requestId: string;
  sourceText: string;
  translatedText: string;
  sourceLanguage: SourceLanguage;
  targetLanguage: TargetLanguage;
  provider: 'chrome-translator';
  cached: boolean;
  durationMs: number;
  createdAt: number;
}

export type TranslationErrorCode =
  | 'API_UNSUPPORTED'
  | 'PAIR_UNAVAILABLE'
  | 'MODEL_DOWNLOAD_FAILED'
  | 'TRANSLATION_FAILED'
  | 'ABORTED'
  | 'INVALID_INPUT';

export interface TranslationError {
  code: TranslationErrorCode;
  message: string;
  cause?: unknown;
}
