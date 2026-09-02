import { describe, expect, it } from 'vitest';
import { classifyText, containsMostlyChinese } from '../core/language/classify';
import {
  getTargetLanguages,
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
  });
});
