import { describe, expect, it, vi } from 'vitest';
import { ChromeLanguageDetector, detectLanguageByScript } from '../core/language/language-detector';

describe('language detection', () => {
  it('detects unique scripts and defers ambiguous Latin or Han text', () => {
    expect(detectLanguageByScript('This is English')).toBeNull();
    expect(detectLanguageByScript('这是中文')).toBeNull();
    expect(detectLanguageByScript('これは日本語です')).toBe('ja');
    expect(detectLanguageByScript('한국어 문장입니다')).toBe('ko');
    expect(detectLanguageByScript('¿Cómo estás?')).toBe('es');
    expect(detectLanguageByScript('français')).toBe('fr');
    expect(detectLanguageByScript('Grüße aus Berlin')).toBe('de');
    expect(detectLanguageByScript('مرحبا')).toBe('ar');
    expect(detectLanguageByScript('שלום')).toBe('he');
    expect(detectLanguageByScript('Γειά σου')).toBe('el');
    expect(detectLanguageByScript('สวัสดี')).toBe('th');
    expect(detectLanguageByScript('їжак')).toBe('uk');
  });

  it('returns unknown for ambiguous script', () => {
    expect(detectLanguageByScript('API 接口')).toBeNull();
  });

  it('falls back without the Chrome Language Detector API', async () => {
    const detector = new ChromeLanguageDetector();

    await expect(detector.detect('hello')).resolves.toBeNull();
    await expect(detector.detect('你好')).resolves.toBeNull();
    await expect(detector.detect('12345')).resolves.toBeNull();
  });

  it('accepts a clear short-text candidate and exposes alternatives', async () => {
    const detectorInstance = {
      detect: vi.fn(async () => [
        { detectedLanguage: 'en', confidence: 0.42 },
        { detectedLanguage: 'fr', confidence: 0.12 },
      ]),
    } as unknown as BuiltInAiLanguageDetector;
    const api = {
      create: vi.fn(async () => detectorInstance),
    } satisfies BuiltInAiLanguageDetectorConstructor;
    vi.stubGlobal('LanguageDetector', api);

    const detector = new ChromeLanguageDetector();
    await expect(detector.detect('bold')).resolves.toBe('en');
    await expect(detector.detectWithCandidates('bold')).resolves.toEqual({
      language: 'en',
      candidates: [
        { language: 'en', confidence: 0.42 },
        { language: 'fr', confidence: 0.12 },
      ],
    });

    vi.unstubAllGlobals();
  });

  it('keeps a short text unknown when candidates are too close', async () => {
    const detectorInstance = {
      detect: vi.fn(async () => [
        { detectedLanguage: 'en', confidence: 0.42 },
        { detectedLanguage: 'fr', confidence: 0.31 },
      ]),
    } as unknown as BuiltInAiLanguageDetector;
    const api = {
      create: vi.fn(async () => detectorInstance),
    } satisfies BuiltInAiLanguageDetectorConstructor;
    vi.stubGlobal('LanguageDetector', api);

    const detector = new ChromeLanguageDetector();
    const result = await detector.detectWithCandidates('bold');

    expect(result.language).toBeNull();
    expect(result.candidates).toHaveLength(2);
    vi.unstubAllGlobals();
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
