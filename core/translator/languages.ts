import type {
  DisplayLanguage,
  SourceLanguage,
  SupportedLanguage,
  TargetLanguage,
} from './types';

/**
 * The single language catalog shared by the UI, source selector, target
 * selector, detector, speech synthesis, and Translator API requests.
 *
 * nativeLabel is the local fallback. Displayed names are produced by
 * Intl.DisplayNames so every interface language can name the same catalog
 * without maintaining a second, incomplete language list.
 */
export interface LanguageDefinition {
  code: SupportedLanguage;
  nativeLabel: string;
  speechLocale: string;
}

export const SUPPORTED_LANGUAGES: readonly LanguageDefinition[] = [
  { code: 'ar', nativeLabel: 'العربية', speechLocale: 'ar-SA' },
  { code: 'bg', nativeLabel: 'Български', speechLocale: 'bg-BG' },
  { code: 'bn', nativeLabel: 'বাংলা', speechLocale: 'bn-BD' },
  { code: 'cs', nativeLabel: 'Čeština', speechLocale: 'cs-CZ' },
  { code: 'da', nativeLabel: 'Dansk', speechLocale: 'da-DK' },
  { code: 'de', nativeLabel: 'Deutsch', speechLocale: 'de-DE' },
  { code: 'el', nativeLabel: 'Ελληνικά', speechLocale: 'el-GR' },
  { code: 'en', nativeLabel: 'English', speechLocale: 'en-US' },
  { code: 'es', nativeLabel: 'Español', speechLocale: 'es-ES' },
  { code: 'fi', nativeLabel: 'Suomi', speechLocale: 'fi-FI' },
  { code: 'fr', nativeLabel: 'Français', speechLocale: 'fr-FR' },
  { code: 'he', nativeLabel: 'עברית', speechLocale: 'he-IL' },
  { code: 'hi', nativeLabel: 'हिन्दी', speechLocale: 'hi-IN' },
  { code: 'hr', nativeLabel: 'Hrvatski', speechLocale: 'hr-HR' },
  { code: 'hu', nativeLabel: 'Magyar', speechLocale: 'hu-HU' },
  { code: 'id', nativeLabel: 'Bahasa Indonesia', speechLocale: 'id-ID' },
  { code: 'it', nativeLabel: 'Italiano', speechLocale: 'it-IT' },
  { code: 'ja', nativeLabel: '日本語', speechLocale: 'ja-JP' },
  { code: 'kn', nativeLabel: 'ಕನ್ನಡ', speechLocale: 'kn-IN' },
  { code: 'ko', nativeLabel: '한국어', speechLocale: 'ko-KR' },
  { code: 'lt', nativeLabel: 'Lietuvių', speechLocale: 'lt-LT' },
  { code: 'mr', nativeLabel: 'मराठी', speechLocale: 'mr-IN' },
  { code: 'nl', nativeLabel: 'Nederlands', speechLocale: 'nl-NL' },
  { code: 'no', nativeLabel: 'Norsk', speechLocale: 'no-NO' },
  { code: 'pl', nativeLabel: 'Polski', speechLocale: 'pl-PL' },
  { code: 'pt', nativeLabel: 'Português', speechLocale: 'pt-PT' },
  { code: 'ro', nativeLabel: 'Română', speechLocale: 'ro-RO' },
  { code: 'ru', nativeLabel: 'Русский', speechLocale: 'ru-RU' },
  { code: 'sk', nativeLabel: 'Slovenčina', speechLocale: 'sk-SK' },
  { code: 'sl', nativeLabel: 'Slovenščina', speechLocale: 'sl-SI' },
  { code: 'sv', nativeLabel: 'Svenska', speechLocale: 'sv-SE' },
  { code: 'ta', nativeLabel: 'தமிழ்', speechLocale: 'ta-IN' },
  { code: 'te', nativeLabel: 'తెలుగు', speechLocale: 'te-IN' },
  { code: 'th', nativeLabel: 'ไทย', speechLocale: 'th-TH' },
  { code: 'tr', nativeLabel: 'Türkçe', speechLocale: 'tr-TR' },
  { code: 'uk', nativeLabel: 'Українська', speechLocale: 'uk-UA' },
  { code: 'vi', nativeLabel: 'Tiếng Việt', speechLocale: 'vi-VN' },
  { code: 'zh', nativeLabel: '简体中文', speechLocale: 'zh-CN' },
  { code: 'zh-Hant', nativeLabel: '繁體中文', speechLocale: 'zh-TW' },
];

const LANGUAGE_BY_CODE = new Map(
  SUPPORTED_LANGUAGES.map((language) => [language.code, language]),
);

const DISPLAY_NAME_LOCALE: Record<DisplayLanguage, string> = {
  ar: 'ar',
  bg: 'bg',
  bn: 'bn',
  cs: 'cs',
  da: 'da',
  de: 'de',
  el: 'el',
  en: 'en',
  es: 'es',
  fi: 'fi',
  fr: 'fr',
  he: 'he',
  hi: 'hi',
  hr: 'hr',
  hu: 'hu',
  id: 'id',
  it: 'it',
  ja: 'ja',
  kn: 'kn',
  ko: 'ko',
  lt: 'lt',
  mr: 'mr',
  nl: 'nl',
  no: 'no',
  pl: 'pl',
  pt: 'pt',
  ro: 'ro',
  ru: 'ru',
  sk: 'sk',
  sl: 'sl',
  sv: 'sv',
  ta: 'ta',
  te: 'te',
  th: 'th',
  tr: 'tr',
  uk: 'uk',
  vi: 'vi',
  zh: 'zh-CN',
  'zh-Hant': 'zh-TW',
};

const DISPLAY_NAMES_BY_LANGUAGE = new Map<
  DisplayLanguage,
  Intl.DisplayNames
>();

const LANGUAGE_LABEL_OVERRIDES: Partial<
  Record<DisplayLanguage, Partial<Record<SupportedLanguage, string>>>
> = {
  zh: {
    zh: '简体中文',
    'zh-Hant': '繁体中文',
  },
  en: {
    zh: 'Chinese (Simplified)',
    'zh-Hant': 'Chinese (Traditional)',
  },
  ja: {
    zh: '中国語（簡体字）',
    'zh-Hant': '中国語（繁体字）',
  },
  ko: {
    zh: '중국어(간체)',
    'zh-Hant': '중국어(번체)',
  },
};

function getDisplayNames(language: DisplayLanguage): Intl.DisplayNames {
  const existing = DISPLAY_NAMES_BY_LANGUAGE.get(language);
  if (existing) {
    return existing;
  }

  const displayNames = new Intl.DisplayNames(
    [DISPLAY_NAME_LOCALE[language]],
    { type: 'language' },
  );
  DISPLAY_NAMES_BY_LANGUAGE.set(language, displayNames);
  return displayNames;
}

export function isSupportedLanguage(value: string): value is SupportedLanguage {
  return LANGUAGE_BY_CODE.has(value as SupportedLanguage);
}

export function isInterfaceLanguage(value: unknown): value is DisplayLanguage {
  return typeof value === 'string' && isSupportedLanguage(value);
}

const BROWSER_LOCALE_OVERRIDES: Record<string, DisplayLanguage> = {
  'zh-hant': 'zh-Hant',
  'zh-tw': 'zh-Hant',
  'zh-hk': 'zh-Hant',
  'zh-mo': 'zh-Hant',
};

const BROWSER_LANGUAGE_ALIASES: Record<string, DisplayLanguage> = {
  iw: 'he',
  nb: 'no',
};

const RTL_DISPLAY_LANGUAGES = new Set<DisplayLanguage>(['ar', 'he']);

export function displayLanguageFromLocale(
  locale: unknown,
): DisplayLanguage | null {
  if (typeof locale !== 'string') {
    return null;
  }

  const normalizedLocale = locale.trim().replaceAll('_', '-').toLowerCase();
  if (!normalizedLocale) {
    return null;
  }

  const override = BROWSER_LOCALE_OVERRIDES[normalizedLocale];
  if (override) {
    return override;
  }

  const primaryLanguage = normalizedLocale.split('-')[0];
  if (!primaryLanguage) {
    return null;
  }

  const alias = BROWSER_LANGUAGE_ALIASES[primaryLanguage];
  if (alias) {
    return alias;
  }

  const language = SUPPORTED_LANGUAGES.find(
    (definition) => definition.code.toLowerCase() === primaryLanguage,
  );

  return language?.code ?? null;
}

export function languageLabel(
  language: SupportedLanguage,
  displayLanguage: DisplayLanguage = 'en',
): string {
  const definition = LANGUAGE_BY_CODE.get(language);
  if (!definition) {
    return language;
  }

  const languageOverride = LANGUAGE_LABEL_OVERRIDES[displayLanguage]?.[language];
  if (languageOverride) {
    return languageOverride;
  }

  try {
    return getDisplayNames(displayLanguage).of(language) ?? definition.nativeLabel;
  } catch {
    return definition.nativeLabel;
  }
}

export function languageInputLabel(language: SupportedLanguage): string {
  return languageLabel(language, 'zh');
}

export function languageSpeechLocale(language: SupportedLanguage): string {
  return LANGUAGE_BY_CODE.get(language)?.speechLocale ?? 'en-US';
}

export function languageHtmlLocale(language: DisplayLanguage): string {
  return DISPLAY_NAME_LOCALE[language];
}

export function isRtlDisplayLanguage(language: DisplayLanguage): boolean {
  return RTL_DISPLAY_LANGUAGES.has(language);
}

export function getDefaultTargetLanguage(
  sourceLanguage: SourceLanguage,
): TargetLanguage {
  if (sourceLanguage === 'en') {
    return 'zh';
  }

  if (sourceLanguage === 'zh') {
    return 'en';
  }

  return 'zh';
}

export function resolveTargetLanguageForSource(
  sourceLanguage: SourceLanguage,
  targetLanguage: TargetLanguage,
  targetLanguageManuallySelected: boolean,
): TargetLanguage {
  if (targetLanguageManuallySelected || sourceLanguage !== targetLanguage) {
    return targetLanguage;
  }

  return getDefaultTargetLanguage(sourceLanguage);
}

export function isSupportedTranslationPair(
  sourceLanguage: SourceLanguage,
  targetLanguage: TargetLanguage,
): boolean {
  return (
    sourceLanguage !== targetLanguage &&
    isSupportedLanguage(sourceLanguage) &&
    isSupportedLanguage(targetLanguage)
  );
}

export function getTargetLanguages(
  _sourceLanguage: SourceLanguage,
): readonly TargetLanguage[] {
  return SUPPORTED_LANGUAGES.map((language) => language.code);
}

export function getTranslationPairLabel(
  sourceLanguage: SourceLanguage,
  targetLanguage: TargetLanguage,
): string {
  return `${languageLabel(sourceLanguage)} → ${languageLabel(targetLanguage)}`;
}
