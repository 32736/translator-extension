export type SupportedLanguage =
  | 'ar'
  | 'bg'
  | 'bn'
  | 'cs'
  | 'da'
  | 'de'
  | 'el'
  | 'en'
  | 'es'
  | 'fi'
  | 'fr'
  | 'he'
  | 'hi'
  | 'hr'
  | 'hu'
  | 'id'
  | 'it'
  | 'ja'
  | 'kn'
  | 'ko'
  | 'lt'
  | 'mr'
  | 'nl'
  | 'no'
  | 'pl'
  | 'pt'
  | 'ro'
  | 'ru'
  | 'sk'
  | 'sl'
  | 'sv'
  | 'ta'
  | 'te'
  | 'th'
  | 'tr'
  | 'uk'
  | 'vi'
  | 'zh'
  | 'zh-Hant';
/**
 * The interface uses the same language catalog as the Translator API.
 * Source and target selectors use this type too; source adds `auto` at the UI
 * boundary instead of adding a pseudo-language to the shared catalog.
 */
export type DisplayLanguage = SupportedLanguage;
export type SourceLanguage = SupportedLanguage;
export type TargetLanguage = SupportedLanguage;

export type TranslatorAvailability =
  | 'unsupported'
  | 'unavailable'
  | 'downloadable'
  | 'downloading'
  | 'available'
  | 'unknown';
