import { describe, expect, it } from 'vitest';
import {
  getUiCopy,
  isDisplayLanguage,
  languageLabelForDisplay,
} from '../core/i18n/ui';
import { SUPPORTED_LANGUAGES } from '../core/translator/languages';

describe('display language copy', () => {
  it('provides copy for all supported interface languages', () => {
    expect(getUiCopy('zh').inputLabel).toBe('原文');
    expect(getUiCopy('en').inputLabel).toBe('Original');
    expect(getUiCopy('ja').inputLabel).toBe('原文');
    expect(getUiCopy('ko').inputLabel).toBe('원문');
    expect(getUiCopy('zh').deleteHistory('hello')).toContain('hello');
    expect(getUiCopy('en').deleteFavorite('hello')).toContain('hello');
  });

  it('localizes language option labels', () => {
    expect(languageLabelForDisplay('en', 'zh')).toBe('英语');
    expect(languageLabelForDisplay('zh', 'zh')).toBe('简体中文');
    expect(languageLabelForDisplay('ja', 'zh')).toBe('日语');
    expect(languageLabelForDisplay('ko', 'zh')).toBe('韩语');
    expect(languageLabelForDisplay('en', 'en')).toBe('English');
    expect(languageLabelForDisplay('zh', 'en')).toBe('Chinese (Simplified)');
    expect(languageLabelForDisplay('ja', 'en')).toBe('Japanese');
    expect(languageLabelForDisplay('ko', 'en')).toBe('Korean');
    expect(languageLabelForDisplay('en', 'ja')).toBe('英語');
    expect(languageLabelForDisplay('zh', 'ja')).toBe('中国語（簡体字）');
    expect(languageLabelForDisplay('ja', 'ko')).toBe('일본어');
    expect(languageLabelForDisplay('ko', 'ko')).toBe('한국어');
    expect(languageLabelForDisplay('es', 'zh')).toBe('西班牙语');
    expect(languageLabelForDisplay('fr', 'en')).toBe('French');
    expect(languageLabelForDisplay('de', 'ja')).toBe('ドイツ語');
    expect(languageLabelForDisplay('zh-Hant', 'ko')).toBe('중국어(번체)');
  });

  it('validates supported display languages', () => {
    expect(isDisplayLanguage('zh')).toBe(true);
    expect(isDisplayLanguage('en')).toBe(true);
    expect(isDisplayLanguage('ja')).toBe(true);
    expect(isDisplayLanguage('ko')).toBe(true);
    expect(isDisplayLanguage('fr')).toBe(true);
    expect(isDisplayLanguage('zh-Hant')).toBe(true);
    expect(isDisplayLanguage('auto')).toBe(false);
    expect(
      SUPPORTED_LANGUAGES.every(
        ({ code }) => isDisplayLanguage(code) && getUiCopy(code).translate.length > 0,
      ),
    ).toBe(true);
  });
});
