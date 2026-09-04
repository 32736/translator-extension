import {
  displayLanguageFromLocale,
  isInterfaceLanguage,
} from '../translator/languages';
import type { DisplayLanguage } from '../translator/types';

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

function getBrowserUiLocale(): string | undefined {
  try {
    if (
      typeof chrome !== 'undefined' &&
      typeof chrome.i18n?.getUILanguage === 'function'
    ) {
      return chrome.i18n.getUILanguage();
    }
  } catch {
    // The API may be unavailable in tests or a non-extension context.
  }

  return undefined;
}

export function getDefaultDisplayLanguage(): DisplayLanguage {
  const browserLocale =
    getBrowserUiLocale() ??
    (typeof navigator !== 'undefined' ? navigator.language : undefined);

  return (
    displayLanguageFromLocale(browserLocale) ?? DEFAULT_SETTINGS.displayLanguage
  );
}

async function getDefaultDisplayLanguageWithPreferences(): Promise<DisplayLanguage> {
  const browserUiLanguage = displayLanguageFromLocale(getBrowserUiLocale());
  if (browserUiLanguage) {
    return browserUiLanguage;
  }

  const preferredLocales: string[] = [];

  try {
    if (
      typeof chrome !== 'undefined' &&
      typeof chrome.i18n?.getAcceptLanguages === 'function'
    ) {
      preferredLocales.push(...(await chrome.i18n.getAcceptLanguages()));
    }
  } catch {
    // Continue with navigator preferences when the extension API is unavailable.
  }

  if (typeof navigator !== 'undefined') {
    preferredLocales.push(...navigator.languages, navigator.language);
  }

  for (const locale of preferredLocales) {
    const language = displayLanguageFromLocale(locale);
    if (language) {
      return language;
    }
  }

  return DEFAULT_SETTINGS.displayLanguage;
}

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
    isInterfaceLanguage(settings.displayLanguage)
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
      isInterfaceLanguage(settings.displayLanguage))
  );
}

export async function loadSettings(): Promise<Settings> {
  const stored = await chrome.storage.sync.get(SETTINGS_KEY);
  const value: unknown = stored[SETTINGS_KEY];
  const defaultDisplayLanguage =
    await getDefaultDisplayLanguageWithPreferences();

  if (!isStoredSettings(value)) {
    return {
      ...DEFAULT_SETTINGS,
      displayLanguage: defaultDisplayLanguage,
    };
  }

  return {
    theme: value.theme,
    selectionEnabled: value.selectionEnabled,
    displayLanguage: isInterfaceLanguage(value.displayLanguage)
      ? value.displayLanguage
      : defaultDisplayLanguage,
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
