import { getTriggerPosition } from './position';
import { CONTENT_UI_STYLES } from './styles';

const MAX_SELECTION_LENGTH = 1000;
const HOST_ID = '__translator_extension_root__';

export interface SelectionDetails {
  text: string;
  rect: DOMRect;
  tooLong: boolean;
}

export type SelectionHandler = (selection: SelectionDetails) => void;

function getSelectionElement(node: Node | null): Element | null {
  if (node instanceof Element) {
    return node;
  }

  return node?.parentElement ?? null;
}

function isExcludedSelection(node: Node | null): boolean {
  return (
    getSelectionElement(node)?.closest(
      'input, textarea, [contenteditable]',
    ) !== null
  );
}

export class SelectionTriggerController {
  private readonly host: HTMLDivElement;
  private readonly shadow: ShadowRoot;
  private readonly trigger: HTMLButtonElement;
  private selectedDetails: SelectionDetails | null = null;
  private readonly onSelection: SelectionHandler;

  constructor(onSelection: SelectionHandler) {
    this.onSelection = onSelection;
    this.host = document.createElement('div');
    this.host.id = HOST_ID;
    this.host.style.position = 'fixed';
    this.host.style.inset = '0';
    this.host.style.zIndex = '2147483647';
    this.host.style.pointerEvents = 'none';
    this.shadow = this.host.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = CONTENT_UI_STYLES;
    this.shadow.append(style);

    this.trigger = document.createElement('button');
    this.trigger.className = 'trigger';
    this.trigger.type = 'button';
    this.trigger.textContent = '译';
    this.trigger.title = '翻译所选文本';
    this.trigger.setAttribute('aria-label', '翻译所选文本');
    this.trigger.hidden = true;
    this.shadow.append(this.trigger);
  }

  mount(): void {
    document.documentElement.append(this.host);
    document.addEventListener('mouseup', this.handleMouseUp, true);
    document.addEventListener('mousedown', this.handleDocumentMouseDown, true);
    document.addEventListener('keydown', this.handleKeyDown, true);
    document.addEventListener('selectionchange', this.hide, true);
    document.addEventListener('scroll', this.hide, true);
    window.addEventListener('resize', this.hide);
    this.trigger.addEventListener('click', this.handleTriggerClick);
  }

  destroy(): void {
    document.removeEventListener('mouseup', this.handleMouseUp, true);
    document.removeEventListener('mousedown', this.handleDocumentMouseDown, true);
    document.removeEventListener('keydown', this.handleKeyDown, true);
    document.removeEventListener('selectionchange', this.hide, true);
    document.removeEventListener('scroll', this.hide, true);
    window.removeEventListener('resize', this.hide);
    this.trigger.removeEventListener('click', this.handleTriggerClick);
    this.host.remove();
  }

  get shadowRoot(): ShadowRoot {
    return this.shadow;
  }

  hide = (): void => {
    this.selectedDetails = null;
    this.trigger.hidden = true;
  };

  private handleMouseUp = (event: MouseEvent): void => {
    if (event.button !== 0) {
      return;
    }

    window.setTimeout(() => {
      this.showForCurrentSelection();
    }, 0);
  };

  private handleDocumentMouseDown = (event: MouseEvent): void => {
    if (event.composedPath().includes(this.host)) {
      return;
    }

    this.hide();
  };

  private handleKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      this.hide();
    }
  };

  private handleTriggerClick = (event: MouseEvent): void => {
    event.stopPropagation();

    if (this.selectedDetails !== null) {
      this.onSelection(this.selectedDetails);
    }
  };

  private showForCurrentSelection(): void {
    const selection = window.getSelection();

    if (
      selection === null ||
      selection.isCollapsed ||
      selection.rangeCount === 0 ||
      isExcludedSelection(selection.anchorNode)
    ) {
      this.hide();
      return;
    }

    const text = selection.toString().trim();
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    if (!text || rect.width === 0 || rect.height === 0) {
      this.hide();
      return;
    }

    this.selectedDetails = {
      text,
      rect,
      tooLong: text.length > MAX_SELECTION_LENGTH,
    };
    const position = getTriggerPosition(rect);
    this.trigger.style.left = `${position.left}px`;
    this.trigger.style.top = `${position.top}px`;
    this.trigger.hidden = false;
  }
}
