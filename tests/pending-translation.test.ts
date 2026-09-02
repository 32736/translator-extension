import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import {
  getPendingTranslation,
  queueTranslationRequest,
} from '../core/messaging/pending-translation';

describe('pending translation storage', () => {
  let storedValue: unknown;
  let session: {
    get: ReturnType<typeof vi.fn>;
    set: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    storedValue = undefined;
    session = {
      get: vi.fn(async () => ({ pendingTranslation: storedValue })),
      set: vi.fn(async (value: Record<string, unknown>) => {
        storedValue = value.pendingTranslation;
      }),
      remove: vi.fn(async () => {
        storedValue = undefined;
      }),
    };
    vi.stubGlobal('chrome', { storage: { session } });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('trims and stores a valid request', async () => {
    const queued = await queueTranslationRequest(
      '  hello  ',
      'selection',
    );
    const loaded = await getPendingTranslation();

    expect(queued.text).toBe('hello');
    expect(loaded).toMatchObject({ text: 'hello', source: 'selection' });
  });

  it('rejects empty requests', async () => {
    await expect(queueTranslationRequest('  ', 'selection')).rejects.toThrow();
  });

  it('removes stale requests instead of replaying them', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-02T00:00:00.000Z'));
    await queueTranslationRequest('hello', 'context-menu');
    vi.setSystemTime(new Date('2026-09-02T00:11:00.000Z'));

    await expect(getPendingTranslation()).resolves.toBeNull();
    expect(session.remove).toHaveBeenCalledWith('pendingTranslation');
    vi.useRealTimers();
  });
});
