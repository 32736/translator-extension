export type ThemeMode = 'system' | 'light' | 'dark';

export interface Settings {
  theme: ThemeMode;
  selectionEnabled: boolean;
}

export const SETTINGS_KEY = 'translatorSettings';

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  selectionEnabled: true,
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
    typeof settings.selectionEnabled === 'boolean'
  );
}

export async function loadSettings(): Promise<Settings> {
  const stored = await chrome.storage.sync.get(SETTINGS_KEY);
  const value: unknown = stored[SETTINGS_KEY];

  return isSettings(value) ? value : DEFAULT_SETTINGS;
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
