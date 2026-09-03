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
});
