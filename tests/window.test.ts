import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import type { TranslatorWindowState } from '../core/window/translator-window';
import { ensureTranslatorWindow } from '../core/window/translator-window';

describe('translator window management', () => {
  let state: TranslatorWindowState;
  let chromeMock: {
    storage: { local: { get: ReturnType<typeof vi.fn>; set: ReturnType<typeof vi.fn> } };
    runtime: { getURL: ReturnType<typeof vi.fn> };
    windows: {
      get: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      onBoundsChanged: { addListener: ReturnType<typeof vi.fn> };
      onRemoved: { addListener: ReturnType<typeof vi.fn> };
    };
  };

  beforeEach(() => {
    state = {};
    chromeMock = {
      storage: {
        local: {
          get: vi.fn(async () => ({ translatorWindow: state })),
          set: vi.fn(async () => undefined),
        },
      },
      runtime: {
        getURL: vi.fn((path: string) => `chrome-extension://test${path}`),
      },
      windows: {
        get: vi.fn(),
        update: vi.fn(async () => undefined),
        create: vi.fn(),
        onBoundsChanged: { addListener: vi.fn() },
        onRemoved: { addListener: vi.fn() },
      },
    };
    vi.stubGlobal('chrome', chromeMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('focuses an existing translator window', async () => {
    state = { windowId: 42 };
    chromeMock.windows.get.mockResolvedValue({ id: 42 });

    await expect(ensureTranslatorWindow()).resolves.toBe(42);

    expect(chromeMock.windows.update).toHaveBeenCalledWith(42, {
      focused: true,
    });
    expect(chromeMock.windows.create).not.toHaveBeenCalled();
  });

  it('creates a replacement when the stored window id is stale', async () => {
    state = { windowId: 42, width: 500, height: 700, left: 10, top: 20 };
    chromeMock.windows.get.mockRejectedValue(new Error('window closed'));
    chromeMock.windows.create.mockResolvedValue({ id: 99 });

    await expect(ensureTranslatorWindow()).resolves.toBe(99);

    expect(chromeMock.windows.create).toHaveBeenCalledWith({
      url: 'chrome-extension://test/translator.html',
      type: 'popup',
      focused: true,
      width: 500,
      height: 700,
      left: 10,
      top: 20,
    });
  });

  it('shares one creation promise for concurrent opens', async () => {
    let resolveCreate: ((value: { id: number }) => void) | undefined;
    chromeMock.windows.create.mockReturnValue(
      new Promise<{ id: number }>((resolve) => {
        resolveCreate = resolve;
      }),
    );

    const first = ensureTranslatorWindow();
    const second = ensureTranslatorWindow();

    expect(first).toBe(second);
    resolveCreate?.({ id: 7 });
    await expect(first).resolves.toBe(7);
    expect(chromeMock.windows.create).toHaveBeenCalledOnce();
  });
});
