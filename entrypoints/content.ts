import { SelectionTriggerController } from '../content-ui/SelectionTrigger';
import { createSelectionTranslationMessage } from '../core/messaging/selection-handoff';
import {
  isSettings,
  loadSettings,
  SETTINGS_KEY,
} from '../core/storage/settings';

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_idle',
  async main() {
    let controller: SelectionTriggerController | null = null;

    const mountSelectionUi = (): void => {
      if (controller !== null) {
        return;
      }

      controller = new SelectionTriggerController((selection) => {
        controller?.hide();
        const message = createSelectionTranslationMessage(
          selection.text,
          selection.tooLong,
        );

        if (message === null) {
          return;
        }

        void chrome.runtime.sendMessage(message).catch(() => {
          // The extension may be restarting while the user clicks the trigger.
        });
      });
      controller.mount();
    };

    const unmountSelectionUi = (): void => {
      controller?.destroy();
      controller = null;
    };

    const settings = await loadSettings();

    if (settings.selectionEnabled) {
      mountSelectionUi();
    }

    const handleSettingsChanged = (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string,
    ): void => {
      if (areaName !== 'sync') {
        return;
      }

      const value: unknown = changes[SETTINGS_KEY]?.newValue;

      if (!isSettings(value)) {
        return;
      }

      if (value.selectionEnabled) {
        mountSelectionUi();
      } else {
        unmountSelectionUi();
      }
    };

    chrome.storage.onChanged.addListener(handleSettingsChanged);

    window.addEventListener(
      'pagehide',
      () => {
        chrome.storage.onChanged.removeListener(handleSettingsChanged);
        unmountSelectionUi();
      },
      { once: true },
    );
  },
});
