export type SupportedLanguage = 'en' | 'zh' | 'ja' | 'ko';
export type SourceLanguage = SupportedLanguage;
export type TargetLanguage = SupportedLanguage;

export type TranslatorAvailability =
  | 'unsupported'
  | 'unavailable'
  | 'downloadable'
  | 'downloading'
  | 'available'
  | 'unknown';
