import {
  ensureTranslatorWindow,
  loadTranslatorWindowState,
  registerTranslatorWindowListeners,
} from '../core/window/translator-window';
import type { RuntimeMessage } from '../core/messaging/messages';
import {
  getPendingTranslation,
  queueTranslationRequest,
  removePendingTranslation,
  type PendingTranslation,
} from '../core/messaging/pending-translation';

let translatorWindowReady = false;

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

async function handleWindowTranslation(
  text: string,
  source: PendingTranslation['source'],
): Promise<void> {
  const pending = await queueTranslationRequest(text, source);
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

  chrome.runtime.onMessage.addListener((message: RuntimeMessage, sender) => {
    if (message.type === 'TRANSLATOR_WINDOW_READY') {
      translatorWindowReady = true;
      void flushPendingTranslation();
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
