import { describe, expect, it } from 'vitest';
import { classifyText, containsMostlyChinese } from '../core/language/classify';
import {
  displayLanguageFromLocale,
  getTargetLanguages,
  isInterfaceLanguage,
  isRtlDisplayLanguage,
  resolveTargetLanguageForSource,
  SUPPORTED_LANGUAGES,
} from '../core/translator/languages';

describe('text classification', () => {
  it('classifies words, phrases, and sentences', () => {
    expect(classifyText('deprecated')).toBe('word');
    expect(classifyText('render pipeline')).toBe('phrase');
    expect(classifyText('This API has been deprecated.')).toBe('sentence');
  });

  it('detects mostly Chinese input', () => {
    expect(containsMostlyChinese('这是中文')).toBe(true);
    expect(containsMostlyChinese('This is English')).toBe(false);
  });

  it('exposes the same concrete language set for target selection', () => {
    const supportedLanguageCodes = SUPPORTED_LANGUAGES.map(
      (language) => language.code,
    );

    expect(getTargetLanguages('en')).toEqual(supportedLanguageCodes);
    expect(getTargetLanguages('zh')).toEqual(supportedLanguageCodes);
    expect(getTargetLanguages('ja')).toEqual(supportedLanguageCodes);
    expect(getTargetLanguages('ko')).toEqual(supportedLanguageCodes);
    expect(getTargetLanguages('es')).toEqual(supportedLanguageCodes);
    expect(getTargetLanguages('fr')).toEqual(supportedLanguageCodes);
    expect(getTargetLanguages('de')).toEqual(supportedLanguageCodes);
    expect(getTargetLanguages('zh-Hant')).toEqual(supportedLanguageCodes);
    expect(supportedLanguageCodes).toEqual([
      'ar',
      'bg',
      'bn',
      'cs',
      'da',
      'de',
      'el',
      'en',
      'es',
      'fi',
      'fr',
      'he',
      'hi',
      'hr',
      'hu',
      'id',
      'it',
      'ja',
      'kn',
      'ko',
      'lt',
      'mr',
      'nl',
      'no',
      'pl',
      'pt',
      'ro',
      'ru',
      'sk',
      'sl',
      'sv',
      'ta',
      'te',
      'th',
      'tr',
      'uk',
      'vi',
      'zh',
      'zh-Hant',
    ]);
    expect(SUPPORTED_LANGUAGES.every((language) => isInterfaceLanguage(language.code))).toBe(true);
    expect(
      SUPPORTED_LANGUAGES.every((language) => language.nativeLabel.length > 0),
    ).toBe(true);
  });

  it('maps browser locales to the shared display language catalog', () => {
    expect(displayLanguageFromLocale('en-US')).toBe('en');
    expect(displayLanguageFromLocale('zh-CN')).toBe('zh');
    expect(displayLanguageFromLocale('zh-TW')).toBe('zh-Hant');
    expect(displayLanguageFromLocale('zh_HK')).toBe('zh-Hant');
    expect(displayLanguageFromLocale('pt-BR')).toBe('pt');
    expect(displayLanguageFromLocale('nb-NO')).toBe('no');
    expect(displayLanguageFromLocale('unsupported-Language')).toBeNull();
  });

  it('identifies the RTL interface languages', () => {
    expect(isRtlDisplayLanguage('ar')).toBe(true);
    expect(isRtlDisplayLanguage('he')).toBe(true);
    expect(isRtlDisplayLanguage('en')).toBe(false);
    expect(isRtlDisplayLanguage('zh')).toBe(false);
  });

  it('avoids the default source and target language collision', () => {
    expect(resolveTargetLanguageForSource('en', 'en', false)).toBe('zh');
    expect(resolveTargetLanguageForSource('zh', 'zh', false)).toBe('en');
    expect(resolveTargetLanguageForSource('ja', 'ja', false)).toBe('zh');
    expect(resolveTargetLanguageForSource('en', 'en', true)).toBe('en');
    expect(resolveTargetLanguageForSource('en', 'zh', false)).toBe('zh');
  });
});
