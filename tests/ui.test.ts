import { describe, expect, it } from 'vitest';
import {
  getUiCopy,
  isDisplayLanguage,
  languageLabelForDisplay,
} from '../core/i18n/ui';

describe('display language copy', () => {
  it('provides Chinese and English interface copy', () => {
    expect(getUiCopy('zh').inputLabel).toBe('原文');
    expect(getUiCopy('en').inputLabel).toBe('Original');
    expect(getUiCopy('zh').deleteHistory('hello')).toContain('hello');
    expect(getUiCopy('en').deleteFavorite('hello')).toContain('hello');
  });

  it('localizes language option labels', () => {
    expect(languageLabelForDisplay('zh', 'zh')).toBe('简体中文');
    expect(languageLabelForDisplay('zh', 'en')).toBe('Chinese');
  });

  it('validates supported display languages', () => {
    expect(isDisplayLanguage('zh')).toBe(true);
    expect(isDisplayLanguage('en')).toBe(true);
    expect(isDisplayLanguage('ja')).toBe(false);
  });
});
