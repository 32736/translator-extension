import type { SourceLanguage, SupportedLanguage, TargetLanguage } from './types';

export interface LanguageDefinition {
  code: SupportedLanguage;
  label: string;
  inputLabel: string;
  speechLocale: string;
}

export const SUPPORTED_LANGUAGES: readonly LanguageDefinition[] = [
  {
    code: 'en',
    label: 'English',
    inputLabel: '输入英文',
    speechLocale: 'en-US',
  },
  {
    code: 'zh',
    label: '简体中文',
    inputLabel: '输入中文',
    speechLocale: 'zh-CN',
  },
  {
    code: 'ja',
    label: '日本語',
    inputLabel: '输入日文',
    speechLocale: 'ja-JP',
  },
  {
    code: 'ko',
    label: '한국어',
    inputLabel: '输入韩文',
    speechLocale: 'ko-KR',
  },
];

const LANGUAGE_BY_CODE = new Map(
  SUPPORTED_LANGUAGES.map((language) => [language.code, language]),
);

const SUPPORTED_TRANSLATION_PAIRS = new Set([
  'en|zh',
  'zh|en',
  'ja|zh',
  'ko|zh',
]);

export function isSupportedLanguage(value: string): value is SupportedLanguage {
  return LANGUAGE_BY_CODE.has(value as SupportedLanguage);
}

export function languageLabel(language: SupportedLanguage): string {
  return LANGUAGE_BY_CODE.get(language)?.label ?? language;
}

export function languageInputLabel(language: SupportedLanguage): string {
  return LANGUAGE_BY_CODE.get(language)?.inputLabel ?? '输入内容';
}

export function languageSpeechLocale(language: SupportedLanguage): string {
  return LANGUAGE_BY_CODE.get(language)?.speechLocale ?? 'en-US';
}

export function getDefaultTargetLanguage(
  sourceLanguage: SourceLanguage,
): TargetLanguage {
  return sourceLanguage === 'en' ? 'zh' : sourceLanguage === 'zh' ? 'en' : 'zh';
}

export function isSupportedTranslationPair(
  sourceLanguage: SourceLanguage,
  targetLanguage: TargetLanguage,
): boolean {
  return SUPPORTED_TRANSLATION_PAIRS.has(`${sourceLanguage}|${targetLanguage}`);
}

export function getTargetLanguages(
  sourceLanguage: SourceLanguage,
): readonly TargetLanguage[] {
  return SUPPORTED_LANGUAGES
    .map((language) => language.code)
    .filter((targetLanguage): targetLanguage is TargetLanguage =>
      isSupportedTranslationPair(sourceLanguage, targetLanguage),
    );
}

export function getTranslationPairLabel(
  sourceLanguage: SourceLanguage,
  targetLanguage: TargetLanguage,
): string {
  return `${languageLabel(sourceLanguage)} → ${languageLabel(targetLanguage)}`;
}
