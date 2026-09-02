import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SETTINGS,
  isSettings,
} from '../core/storage/settings';

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
    ).toBe(false);
  });
});
