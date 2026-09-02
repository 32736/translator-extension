import { describe, expect, it } from 'vitest';
import { ChromeLanguageDetector, detectLanguageByScript } from '../core/language/language-detector';

describe('language detection', () => {
  it('detects clear English and Chinese script locally', () => {
    expect(detectLanguageByScript('This is English')).toBe('en');
    expect(detectLanguageByScript('这是中文')).toBe('zh');
    expect(detectLanguageByScript('これは日本語です')).toBe('ja');
    expect(detectLanguageByScript('한국어 문장입니다')).toBe('ko');
  });

  it('returns unknown for ambiguous script', () => {
    expect(detectLanguageByScript('API 接口')).toBeNull();
  });

  it('falls back without the Chrome Language Detector API', async () => {
    const detector = new ChromeLanguageDetector();

    await expect(detector.detect('hello')).resolves.toBe('en');
    await expect(detector.detect('你好')).resolves.toBe('zh');
    await expect(detector.detect('12345')).resolves.toBeNull();
  });
});
