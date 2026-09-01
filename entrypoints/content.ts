import {
  SelectionTriggerController,
} from '../content-ui/SelectionTrigger';
import { TranslationPopoverController } from '../content-ui/TranslationPopover';
import { InMemoryCacheRepository } from '../core/storage/cache-repository';
import { ChromeTranslatorProvider } from '../core/translator/chrome-translator-provider';
import type { RuntimeMessage } from '../core/messaging/messages';
import {
  isSettings,
  loadSettings,
  SETTINGS_KEY,
} from '../core/storage/settings';
import { TranslatorService } from '../core/translator/translator-service';

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_idle',
  async main() {
    let provider: ChromeTranslatorProvider | null = null;
    let controller: SelectionTriggerController | null = null;
    let popover: TranslationPopoverController | null = null;

    const mountSelectionUi = (): void => {
      if (controller !== null || provider !== null || popover !== null) {
        return;
      }

      provider = new ChromeTranslatorProvider();
      const service = new TranslatorService(provider, new InMemoryCacheRepository());
      controller = new SelectionTriggerController((selection) => {
        controller?.hide();
        void popover?.open(selection);
      });
      popover = new TranslationPopoverController(
        controller.shadowRoot,
        service,
        (text) => {
          const message: RuntimeMessage = {
            type: 'TRANSLATE_IN_WINDOW',
            payload: { text, source: 'selection' },
          };
          void chrome.runtime.sendMessage(message);
        },
      );
      controller.mount();
    };

    const unmountSelectionUi = (): void => {
      popover?.destroy();
      controller?.destroy();
      provider?.destroy();
      popover = null;
      controller = null;
      provider = null;
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
