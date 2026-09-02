import type { SelectionDetails } from './SelectionTrigger';
import { ChromeLanguageDetector } from '../core/language/language-detector';
import {
  getDefaultTargetLanguage,
  languageSpeechLocale,
} from '../core/translator/languages';
import type { TranslationRequest } from '../core/translator/translation-types';
import type { SourceLanguage, TargetLanguage } from '../core/translator/types';
import {
  normalizeText,
  TranslationServiceError,
  type TranslatorService,
} from '../core/translator/translator-service';

type PopoverStatus =
  | 'idle'
  | 'preparing-model'
  | 'translating'
  | 'success'
  | 'error';

export class TranslationPopoverController {
  private readonly shadow: ShadowRoot;
  private readonly popover: HTMLElement;
  private readonly sourceElement: HTMLElement;
  private readonly outputElement: HTMLElement;
  private readonly statusElement: HTMLElement;
  private readonly progressElement: HTMLElement;
  private readonly progressValueElement: HTMLElement;
  private readonly copyButton: HTMLButtonElement;
  private readonly speakButton: HTMLButtonElement;
  private readonly cancelButton: HTMLButtonElement;
  private readonly closeButton: HTMLButtonElement;
  private readonly retryButton: HTMLButtonElement;
  private readonly openButton: HTMLButtonElement;
  private readonly service: TranslatorService;
  private readonly languageDetector: ChromeLanguageDetector;
  private readonly onOpenTranslator: (text: string) => void;
  private sourceLanguage: SourceLanguage = 'en';
  private lastDetails: SelectionDetails | null = null;
  private currentAbortController: AbortController | null = null;
  private requestSequence = 0;
  private previouslyFocusedElement: HTMLElement | null = null;

  constructor(
    shadow: ShadowRoot,
    service: TranslatorService,
    onOpenTranslator: (text: string) => void,
    languageDetector = new ChromeLanguageDetector(),
  ) {
    this.shadow = shadow;
    this.service = service;
    this.languageDetector = languageDetector;
    this.onOpenTranslator = onOpenTranslator;
    this.popover = document.createElement('section');
    this.popover.className = 'popover';
    this.popover.setAttribute('role', 'dialog');
    this.popover.hidden = true;

    const header = document.createElement('div');
    header.className = 'popover-header';
    const title = document.createElement('strong');
    title.id = 'popover-title';
    title.textContent = '翻译';
    this.popover.setAttribute('aria-labelledby', title.id);
    this.cancelButton = this.createButton('取消', 'popover-cancel');
    this.closeButton = this.createButton('关闭', 'popover-close');
    header.append(title, this.cancelButton, this.closeButton);

    this.sourceElement = document.createElement('div');
    this.sourceElement.className = 'popover-source';
    this.outputElement = document.createElement('div');
    this.outputElement.className = 'popover-output';
    this.statusElement = document.createElement('div');
    this.statusElement.className = 'popover-status';
    this.statusElement.setAttribute('role', 'status');
    this.statusElement.setAttribute('aria-live', 'polite');
    this.statusElement.setAttribute('aria-atomic', 'true');
    this.outputElement.setAttribute('aria-live', 'polite');

    this.progressElement = document.createElement('div');
    this.progressElement.className = 'popover-progress';
    this.progressElement.hidden = true;
    this.progressValueElement = document.createElement('div');
    this.progressValueElement.className = 'popover-progress-value';
    this.progressElement.append(this.progressValueElement);

    const actions = document.createElement('div');
    actions.className = 'popover-actions';
    this.speakButton = this.createButton('🔊 发音', 'popover-action');
    this.copyButton = this.createButton('复制', 'popover-action');
    this.retryButton = this.createButton('重试', 'popover-action');
    this.openButton = this.createButton('↗ 打开', 'popover-action');
    actions.append(
      this.speakButton,
      this.copyButton,
      this.retryButton,
      this.openButton,
    );

    this.popover.append(
      header,
      this.sourceElement,
      this.outputElement,
      this.statusElement,
      this.progressElement,
      actions,
    );
    shadow.append(this.popover);

    this.cancelButton.addEventListener('click', this.cancel);
    this.closeButton.addEventListener('click', this.hide);
    this.copyButton.addEventListener('click', this.copy);
    this.speakButton.addEventListener('click', this.speak);
    this.retryButton.addEventListener('click', this.retry);
    this.openButton.addEventListener('click', this.openTranslator);
    document.addEventListener('mousedown', this.handleDocumentMouseDown, true);
    document.addEventListener('keydown', this.handleKeyDown, true);
    document.addEventListener('selectionchange', this.hide, true);
    document.addEventListener('scroll', this.hide, true);
    window.addEventListener('resize', this.hide);
  }

  async open(details: SelectionDetails): Promise<void> {
    if (this.popover.hidden) {
      const focusedElement = this.shadow.activeElement;
      this.previouslyFocusedElement =
        focusedElement instanceof HTMLElement ? focusedElement : null;
    }

    this.currentAbortController?.abort();
    const requestId = ++this.requestSequence;
    this.lastDetails = details;
    this.sourceLanguage = 'en';
    const text = normalizeText(details.text);
    this.sourceElement.textContent = text;
    this.outputElement.textContent = '';
    this.statusElement.textContent = '';
    this.progressElement.hidden = true;
    this.copyButton.hidden = true;
    this.speakButton.hidden = true;
    this.retryButton.hidden = true;
    this.openButton.hidden = true;
    this.cancelButton.hidden = false;
    this.popover.hidden = false;
    this.position(details.rect);
    this.closeButton.focus({ preventScroll: true });

    if (details.tooLong) {
      this.setStatus('error', '当前版本仅支持短文本翻译。');
      this.cancelButton.hidden = true;
      return;
    }

    const abortController = new AbortController();
    this.currentAbortController = abortController;
    this.setStatus('preparing-model', '正在准备本地翻译模型');

    try {
      const detectedLanguage = await this.languageDetector.detect(text, {
        signal: abortController.signal,
        onDownloadProgress: (downloadProgress) => {
          if (requestId === this.requestSequence) {
            this.setStatus('preparing-model', '正在准备本地语言识别模型');
            this.progressElement.hidden = false;
            this.progressValueElement.style.width = `${downloadProgress * 100}%`;
            this.statusElement.textContent = `正在准备本地语言识别模型 ${Math.round(downloadProgress * 100)}%`;
          }
        },
      });

      if (requestId !== this.requestSequence) {
        return;
      }

      if (detectedLanguage === null) {
        this.setStatus(
          'error',
          '无法识别输入语言，请在独立翻译窗口中手动选择源语言。',
        );
        this.cancelButton.hidden = true;
        this.retryButton.hidden = false;
        this.openButton.hidden = false;
        return;
      }

      const sourceLanguage: SourceLanguage = detectedLanguage;
      const targetLanguage: TargetLanguage =
        getDefaultTargetLanguage(sourceLanguage);
      this.sourceLanguage = sourceLanguage;
      const request: TranslationRequest = {
        id: `selection-${requestId}`,
        text,
        sourceLanguage,
        targetLanguage,
        source: 'selection',
        createdAt: Date.now(),
      };

      const result = await this.service.translate(request, {
        signal: abortController.signal,
        onDownloadProgress: (downloadProgress) => {
          if (requestId === this.requestSequence) {
            this.setStatus('preparing-model', '正在准备本地翻译模型');
            this.progressElement.hidden = false;
            this.progressValueElement.style.width = `${downloadProgress * 100}%`;
            this.statusElement.textContent = `正在准备本地翻译模型 ${Math.round(downloadProgress * 100)}%`;
          }
        },
        onTranslating: () => {
          if (requestId === this.requestSequence) {
            this.setStatus('translating', '正在翻译…');
          }
        },
      });

      if (requestId !== this.requestSequence) {
        return;
      }

      this.outputElement.textContent = result.translatedText;
      this.setStatus('success', '');
      this.copyButton.hidden = false;
      this.speakButton.hidden = false;
      this.openButton.hidden = false;
      this.cancelButton.hidden = true;
    } catch (error: unknown) {
      if (requestId !== this.requestSequence) {
        return;
      }

      if (
        error instanceof TranslationServiceError &&
        error.details.code === 'ABORTED'
      ) {
        this.hide();
        return;
      }

      if (
        abortController.signal.aborted ||
        (error instanceof DOMException && error.name === 'AbortError') ||
        (error instanceof Error && error.name === 'AbortError')
      ) {
        this.hide();
        return;
      }

      this.setStatus(
        'error',
        error instanceof TranslationServiceError
          ? error.details.message
          : '翻译失败，请重试。',
      );
      this.cancelButton.hidden = true;
      this.retryButton.hidden = false;
    } finally {
      if (requestId === this.requestSequence) {
        this.currentAbortController = null;
      }
    }
  }

  hide = (): void => {
    this.currentAbortController?.abort();
    this.currentAbortController = null;
    this.requestSequence += 1;
    this.popover.hidden = true;

    const previouslyFocusedElement = this.previouslyFocusedElement;
    this.previouslyFocusedElement = null;

    if (
      previouslyFocusedElement !== null &&
      previouslyFocusedElement.isConnected &&
      !previouslyFocusedElement.hidden
    ) {
      previouslyFocusedElement.focus({ preventScroll: true });
    }
  };

  destroy(): void {
    this.hide();
    this.cancelButton.removeEventListener('click', this.cancel);
    this.closeButton.removeEventListener('click', this.hide);
    this.copyButton.removeEventListener('click', this.copy);
    this.speakButton.removeEventListener('click', this.speak);
    this.retryButton.removeEventListener('click', this.retry);
    this.openButton.removeEventListener('click', this.openTranslator);
    document.removeEventListener('mousedown', this.handleDocumentMouseDown, true);
    document.removeEventListener('keydown', this.handleKeyDown, true);
    document.removeEventListener('selectionchange', this.hide, true);
    document.removeEventListener('scroll', this.hide, true);
    window.removeEventListener('resize', this.hide);
    this.languageDetector.destroy();
    this.popover.remove();
  }

  private readonly cancel = (): void => {
    this.currentAbortController?.abort();
  };

  private readonly retry = (): void => {
    if (this.lastDetails !== null) {
      void this.open(this.lastDetails);
    }
  };

  private readonly copy = (): void => {
    const text = this.outputElement.textContent;

    if (!text) {
      return;
    }

    void navigator.clipboard
      .writeText(text)
      .then(() => {
        this.statusElement.textContent = '已复制';
      })
      .catch(() => {
        this.statusElement.textContent = '复制失败。';
      });
  };

  private readonly speak = (): void => {
    const text = this.sourceElement.textContent;

    if (!text) {
      return;
    }

    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = languageSpeechLocale(this.sourceLanguage);
    speechSynthesis.speak(utterance);
  };

  private readonly openTranslator = (): void => {
    const text = this.sourceElement.textContent;

    if (text) {
      this.onOpenTranslator(text);
      this.hide();
    }
  };

  private readonly handleDocumentMouseDown = (event: MouseEvent): void => {
    const root = this.popover.getRootNode();

    if (root instanceof ShadowRoot && event.composedPath().includes(root.host)) {
      return;
    }

    this.hide();
  };

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      this.hide();
    }
  };

  private createButton(label: string, className: string): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = className;
    button.textContent = label;
    return button;
  }

  private position(rect: DOMRect): void {
    const width = 320;
    const height = 180;
    let left = rect.left;
    let top = rect.bottom + 12;

    if (left + width > window.innerWidth - 8) {
      left = window.innerWidth - width - 8;
    }

    if (top + height > window.innerHeight - 8) {
      top = rect.top - height - 12;
    }

    this.popover.style.left = `${Math.max(8, left)}px`;
    this.popover.style.top = `${Math.max(8, top)}px`;
  }

  private setStatus(status: PopoverStatus, message: string): void {
    this.popover.dataset.status = status;
    this.statusElement.setAttribute('role', status === 'error' ? 'alert' : 'status');
    this.statusElement.setAttribute(
      'aria-live',
      status === 'error' ? 'assertive' : 'polite',
    );
    this.statusElement.textContent = message;
    this.progressElement.hidden = status !== 'preparing-model';
  }
}
