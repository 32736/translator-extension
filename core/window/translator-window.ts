export interface TranslatorWindowState {
  windowId?: number;
  left?: number;
  top?: number;
  width?: number;
  height?: number;
}

const WINDOW_STATE_KEY = 'translatorWindow';
const DEFAULT_BOUNDS = {
  width: 440,
  height: 760,
} as const;
const LEGACY_DEFAULT_BOUNDS = {
  width: 440,
  height: 680,
} as const;
const BOUNDS_SAVE_DEBOUNCE_MS = 300;

let ensureWindowPromise: Promise<number> | null = null;
let boundsSaveTimer: ReturnType<typeof setTimeout> | null = null;
let pendingBoundsWindowId: number | null = null;

function isWindowState(value: unknown): value is TranslatorWindowState {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const state = value as Record<string, unknown>;
  return (
    (state.windowId === undefined || typeof state.windowId === 'number') &&
    (state.left === undefined || typeof state.left === 'number') &&
    (state.top === undefined || typeof state.top === 'number') &&
    (state.width === undefined || typeof state.width === 'number') &&
    (state.height === undefined || typeof state.height === 'number')
  );
}

export async function loadTranslatorWindowState(): Promise<TranslatorWindowState> {
  const stored = await chrome.storage.local.get(WINDOW_STATE_KEY);
  const value: unknown = stored[WINDOW_STATE_KEY];

  return isWindowState(value) ? value : {};
}

async function saveTranslatorWindowState(
  nextState: TranslatorWindowState,
): Promise<void> {
  await chrome.storage.local.set({
    [WINDOW_STATE_KEY]: nextState,
  });
}

export async function clearTranslatorWindowId(): Promise<void> {
  const state = await loadTranslatorWindowState();
  const { windowId: _windowId, ...bounds } = state;

  await saveTranslatorWindowState(bounds);
}

function migrateDefaultBounds(state: TranslatorWindowState): TranslatorWindowState {
  const usesLegacyDefaultHeight = state.height === LEGACY_DEFAULT_BOUNDS.height;
  const usesLegacyDefaultWidth =
    state.width === undefined || state.width === LEGACY_DEFAULT_BOUNDS.width;

  if (!usesLegacyDefaultHeight || !usesLegacyDefaultWidth) {
    return state;
  }

  return {
    ...state,
    width: state.width ?? DEFAULT_BOUNDS.width,
    height: DEFAULT_BOUNDS.height,
  };
}

async function saveWindowBounds(windowId: number): Promise<void> {
  const state = await loadTranslatorWindowState();

  if (state.windowId !== windowId) {
    return;
  }

  const currentWindow = await chrome.windows.get(windowId);
  await saveTranslatorWindowState({
    ...state,
    left: currentWindow.left,
    top: currentWindow.top,
    width: currentWindow.width,
    height: currentWindow.height,
  });
}

function scheduleBoundsSave(windowId: number): void {
  pendingBoundsWindowId = windowId;

  if (boundsSaveTimer !== null) {
    clearTimeout(boundsSaveTimer);
  }

  boundsSaveTimer = setTimeout(() => {
    const windowIdToSave = pendingBoundsWindowId;
    boundsSaveTimer = null;
    pendingBoundsWindowId = null;

    if (windowIdToSave !== null) {
      void saveWindowBounds(windowIdToSave).catch(() => {
        // The window may be closed before the debounced read completes.
      });
    }
  }, BOUNDS_SAVE_DEBOUNCE_MS);
}

export function registerTranslatorWindowListeners(): void {
  chrome.windows.onBoundsChanged.addListener((changedWindow) => {
    if (changedWindow.id !== undefined) {
      scheduleBoundsSave(changedWindow.id);
    }
  });

  chrome.windows.onRemoved.addListener((windowId) => {
    void loadTranslatorWindowState()
      .then((state) => {
        if (state.windowId === windowId) {
          return clearTranslatorWindowId();
        }

        return undefined;
      })
      .catch(() => {
        // Storage errors should not break the background event listener.
      });
  });
}

async function createTranslatorWindow(
  state: TranslatorWindowState,
): Promise<number> {
  const created = await chrome.windows.create({
    url: chrome.runtime.getURL('/translator.html'),
    type: 'popup',
    focused: true,
    width: state.width ?? DEFAULT_BOUNDS.width,
    height: state.height ?? DEFAULT_BOUNDS.height,
    ...(state.left === undefined ? {} : { left: state.left }),
    ...(state.top === undefined ? {} : { top: state.top }),
  });

  if (created.id === undefined) {
    throw new Error('Unable to create translator window');
  }

  await saveTranslatorWindowState({
    ...state,
    windowId: created.id,
  });

  return created.id;
}

async function ensureTranslatorWindowInternal(): Promise<number> {
  const state = migrateDefaultBounds(await loadTranslatorWindowState());

  if (state.windowId !== undefined) {
    try {
      const existing = await chrome.windows.get(state.windowId);

      if (existing.id !== undefined) {
        await chrome.windows.update(existing.id, {
          focused: true,
        });

        return existing.id;
      }
    } catch {
      // The stored id is stale; create a replacement window below.
    }
  }

  return createTranslatorWindow(state);
}

export function ensureTranslatorWindow(): Promise<number> {
  if (ensureWindowPromise === null) {
    ensureWindowPromise = ensureTranslatorWindowInternal().finally(() => {
      ensureWindowPromise = null;
    });
  }

  return ensureWindowPromise;
}
