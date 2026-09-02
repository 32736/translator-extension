import {
  ensureTranslatorWindow,
  loadTranslatorWindowState,
  registerTranslatorWindowListeners,
} from '../core/window/translator-window';
import {
  isRuntimeMessage,
  type RuntimeMessage,
  type RuntimeResponse,
} from '../core/messaging/messages';
import {
  getPendingTranslation,
  queueTranslationRequest,
  removePendingTranslation,
  type PendingTranslation,
} from '../core/messaging/pending-translation';
import { IndexedDbCacheRepository } from '../core/storage/cache-repository';
import { IndexedDbHistoryRepository } from '../core/storage/history-repository';

let translatorWindowReady = false;
let pendingFlushPromise: Promise<void> | null = null;
const cacheRepository = new IndexedDbCacheRepository();
const historyRepository = new IndexedDbHistoryRepository();

async function sendPendingTranslation(pending: PendingTranslation): Promise<void> {
  const message: RuntimeMessage = {
    type: 'TRANSLATE_IN_WINDOW',
    payload: {
      text: pending.text,
      source: pending.source,
    },
  };

  await chrome.runtime.sendMessage(message);
}

async function flushPendingTranslation(): Promise<void> {
  if (pendingFlushPromise !== null) {
    return pendingFlushPromise;
  }

  pendingFlushPromise = flushPendingTranslationInternal().finally(() => {
    pendingFlushPromise = null;
  });

  return pendingFlushPromise;
}

async function flushPendingTranslationInternal(): Promise<void> {
  if (!translatorWindowReady) {
    return;
  }

  const pending = await getPendingTranslation();

  if (pending === null) {
    return;
  }

  try {
    await sendPendingTranslation(pending);
    await removePendingTranslation(pending.id);
  } catch {
    translatorWindowReady = false;
  }
}

function handleStorageMessage(
  message: RuntimeMessage,
  sendResponse: (response: RuntimeResponse) => void,
): boolean {
  const task = (async (): Promise<RuntimeResponse> => {
    switch (message.type) {
      case 'GET_TRANSLATION_CACHE':
        return {
          ok: true,
          kind: 'cache',
          entity: await cacheRepository.get(message.payload.id),
        };
      case 'SAVE_TRANSLATION_CACHE':
        await cacheRepository.put(message.payload.entity);
        return { ok: true, kind: 'ack' };
      case 'CLEAR_TRANSLATION_CACHE':
        await cacheRepository.clear();
        return { ok: true, kind: 'ack' };
      case 'SAVE_TRANSLATION_HISTORY':
        await historyRepository.save(message.payload.entity);
        return { ok: true, kind: 'ack' };
      case 'DELETE_TRANSLATION_HISTORY':
        await historyRepository.remove(message.payload.id);
        return { ok: true, kind: 'ack' };
      case 'GET_TRANSLATION_HISTORY':
        return {
          ok: true,
          kind: 'history',
          entities: await historyRepository.list(message.payload.limit),
        };
      case 'CLEAR_TRANSLATION_HISTORY':
        await historyRepository.clear();
        return { ok: true, kind: 'ack' };
      default:
        throw new Error('Unsupported storage message');
    }
  })();

  void task
    .then((response) => sendResponse(response))
    .catch(() =>
      sendResponse({
        ok: false,
        message: '扩展本地存储操作失败',
      }),
    );

  return true;
}

async function handleWindowTranslation(
  text: string,
  source: PendingTranslation['source'],
): Promise<void> {
  let pending: PendingTranslation;

  try {
    pending = await queueTranslationRequest(text, source);
  } catch {
    return;
  }

  try {
    await ensureTranslatorWindow();
  } catch {
    return;
  }

  try {
    await sendPendingTranslation(pending);
    await removePendingTranslation(pending.id);
  } catch {
    translatorWindowReady = false;
  }
}

export default defineBackground(() => {
  registerTranslatorWindowListeners();

  chrome.action.onClicked.addListener(() => {
    void ensureTranslatorWindow().catch(() => {
      // The browser may reject a window request while it is shutting down.
    });
  });

  chrome.commands.onCommand.addListener((command) => {
    if (command === 'open-translator') {
      void ensureTranslatorWindow().catch(() => {
        // The browser may reject a window request while it is shutting down.
      });
    }
  });

  chrome.runtime.onMessage.addListener((message: unknown, sender, sendResponse) => {
    if (!isRuntimeMessage(message)) {
      return;
    }

    if (
      message.type === 'TRANSLATOR_WINDOW_READY' &&
      sender.tab === undefined &&
      sender.id === chrome.runtime.id
    ) {
      translatorWindowReady = true;
      void flushPendingTranslation();
      return;
    }

    if (message.type === 'OPEN_TRANSLATOR') {
      void ensureTranslatorWindow().catch(() => {
        // The browser may reject a window request while it is shutting down.
      });
      return;
    }

    if (
      message.type === 'TRANSLATE_IN_WINDOW' &&
      sender.tab !== undefined
    ) {
      void handleWindowTranslation(
        message.payload.text,
        message.payload.source,
      );
      return;
    }

    if (
      sender.tab !== undefined &&
      (message.type === 'GET_TRANSLATION_CACHE' ||
        message.type === 'SAVE_TRANSLATION_CACHE' ||
        message.type === 'CLEAR_TRANSLATION_CACHE' ||
        message.type === 'SAVE_TRANSLATION_HISTORY' ||
        message.type === 'DELETE_TRANSLATION_HISTORY' ||
        message.type === 'GET_TRANSLATION_HISTORY' ||
        message.type === 'CLEAR_TRANSLATION_HISTORY')
    ) {
      return handleStorageMessage(message, sendResponse);
    }
  });

  chrome.runtime.onInstalled.addListener(() => {
    void chrome.contextMenus
      .removeAll()
      .then(() =>
        chrome.contextMenus.create({
          id: 'translate-selection',
          title: '翻译所选文本',
          contexts: ['selection'],
        }),
      )
      .catch(() => {
        // Menu setup can be retried on the next extension lifecycle.
      });
  });

  chrome.contextMenus.onClicked.addListener((info) => {
    const selectionText = info.selectionText?.trim();

    if (info.menuItemId !== 'translate-selection' || !selectionText) {
      return;
    }

    void handleWindowTranslation(selectionText, 'context-menu');
  });

  chrome.windows.onRemoved.addListener((windowId) => {
    void loadTranslatorWindowState()
      .then((state) => {
        if (state.windowId === windowId) {
          translatorWindowReady = false;
        }
      })
      .catch(() => {
        // The dedicated window state listener handles storage cleanup.
      });
  });
});
