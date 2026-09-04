import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_SETTINGS,
  isSettings,
  loadSettings,
} from '../core/storage/settings';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('settings display language', () => {
  it('defaults the display and target language to Chinese', () => {
    expect(DEFAULT_SETTINGS.displayLanguage).toBe('zh');
  });

  it('accepts only complete settings with a supported display language', () => {
    expect(
      isSettings({
        theme: 'system',
        selectionEnabled: true,
        displayLanguage: 'en',
      }),
    ).toBe(true);
    expect(
      isSettings({
        theme: 'system',
        selectionEnabled: true,
        displayLanguage: 'ja',
      }),
    ).toBe(true);
    expect(
      isSettings({
        theme: 'system',
        selectionEnabled: true,
        displayLanguage: 'ko',
      }),
    ).toBe(true);
  });

  it('restores the saved display language for the translator window defaults', async () => {
    vi.stubGlobal('chrome', {
      storage: {
        sync: {
          get: vi.fn(async () => ({
            translatorSettings: {
              theme: 'system',
              selectionEnabled: true,
              displayLanguage: 'en',
            },
          })),
        },
      },
    });

    await expect(loadSettings()).resolves.toMatchObject({
      displayLanguage: 'en',
    });
  });

  it('uses the browser UI language when no display language is saved', async () => {
    vi.stubGlobal('chrome', {
      i18n: {
        getUILanguage: vi.fn(() => 'ja-JP'),
      },
      storage: {
        sync: {
          get: vi.fn(async () => ({
            translatorSettings: undefined,
          })),
        },
      },
    });

    await expect(loadSettings()).resolves.toMatchObject({
      displayLanguage: 'ja',
    });
  });

  it('uses the first supported browser preferred language when the UI locale is unsupported', async () => {
    const getAcceptLanguages = vi.fn(async () => ['ca-ES', 'de-DE', 'en-US']);

    vi.stubGlobal('chrome', {
      i18n: {
        getUILanguage: vi.fn(() => 'ca-ES'),
        getAcceptLanguages,
      },
      storage: {
        sync: {
          get: vi.fn(async () => ({
            translatorSettings: undefined,
          })),
        },
      },
    });

    await expect(loadSettings()).resolves.toMatchObject({
      displayLanguage: 'de',
    });
    expect(getAcceptLanguages).toHaveBeenCalledOnce();
  });
});
