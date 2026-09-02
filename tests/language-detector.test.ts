import { describe, expect, it, vi } from 'vitest';
import { ChromeLanguageDetector, detectLanguageByScript } from '../core/language/language-detector';

describe('language detection', () => {
  it('detects clear English script and defers Han-only text', () => {
    expect(detectLanguageByScript('This is English')).toBe('en');
    expect(detectLanguageByScript('这是中文')).toBeNull();
    expect(detectLanguageByScript('これは日本語です')).toBe('ja');
    expect(detectLanguageByScript('한국어 문장입니다')).toBe('ko');
  });

  it('returns unknown for ambiguous script', () => {
    expect(detectLanguageByScript('API 接口')).toBeNull();
  });

  it('falls back without the Chrome Language Detector API', async () => {
    const detector = new ChromeLanguageDetector();

    await expect(detector.detect('hello')).resolves.toBe('en');
    await expect(detector.detect('你好')).resolves.toBeNull();
    await expect(detector.detect('12345')).resolves.toBeNull();
  });

  it('cancels a pending detector creation and detection', async () => {
    const api = {
      create: vi.fn(
        (options?: BuiltInAiLanguageDetectorCreateOptions) =>
          new Promise<BuiltInAiLanguageDetector>((resolve, reject) => {
            options?.signal?.addEventListener(
              'abort',
              () => reject(new DOMException('Aborted', 'AbortError')),
              { once: true },
            );
          }),
      ),
    } satisfies BuiltInAiLanguageDetectorConstructor;
    vi.stubGlobal('LanguageDetector', api);

    const controller = new AbortController();
    const detector = new ChromeLanguageDetector();
    const pendingDetection = detector.detect('API 接口', {
      signal: controller.signal,
    });

    controller.abort();

    await expect(pendingDetection).rejects.toMatchObject({
      name: 'AbortError',
    });
    vi.unstubAllGlobals();
  });
});
