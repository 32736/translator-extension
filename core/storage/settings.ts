import {
  isDisplayLanguage,
  type DisplayLanguage,
} from '../i18n/ui';

export type ThemeMode = 'system' | 'light' | 'dark';

export interface Settings {
  theme: ThemeMode;
  selectionEnabled: boolean;
  displayLanguage: DisplayLanguage;
}

export const SETTINGS_KEY = 'translatorSettings';

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  selectionEnabled: true,
  displayLanguage: 'zh',
};

function isThemeMode(value: unknown): value is ThemeMode {
  return value === 'system' || value === 'light' || value === 'dark';
}

export function isSettings(value: unknown): value is Settings {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const settings = value as Record<string, unknown>;
  return (
    isThemeMode(settings.theme) &&
    typeof settings.selectionEnabled === 'boolean' &&
    isDisplayLanguage(settings.displayLanguage)
  );
}

function isStoredSettings(value: unknown): value is {
  theme: ThemeMode;
  selectionEnabled: boolean;
  displayLanguage?: unknown;
} {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const settings = value as Record<string, unknown>;
  return (
    isThemeMode(settings.theme) &&
    typeof settings.selectionEnabled === 'boolean' &&
    (settings.displayLanguage === undefined ||
      isDisplayLanguage(settings.displayLanguage))
  );
}

export async function loadSettings(): Promise<Settings> {
  const stored = await chrome.storage.sync.get(SETTINGS_KEY);
  const value: unknown = stored[SETTINGS_KEY];

  if (!isStoredSettings(value)) {
    return DEFAULT_SETTINGS;
  }

  return {
    theme: value.theme,
    selectionEnabled: value.selectionEnabled,
    displayLanguage: isDisplayLanguage(value.displayLanguage)
      ? value.displayLanguage
      : DEFAULT_SETTINGS.displayLanguage,
  };
}

export async function saveSettings(
  partialSettings: Partial<Settings>,
): Promise<Settings> {
  const settings = {
    ...(await loadSettings()),
    ...partialSettings,
  };
  await chrome.storage.sync.set({
    [SETTINGS_KEY]: settings,
  });

  return settings;
}
