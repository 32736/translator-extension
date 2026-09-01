import type { TranslationSource } from '../translator/translation-types';

export type RuntimeMessage =
  | {
      type: 'OPEN_TRANSLATOR';
    }
  | {
      type: 'TRANSLATE_IN_WINDOW';
      payload: {
        text: string;
        source: Exclude<TranslationSource, 'window'>;
      };
    }
  | {
      type: 'TRANSLATOR_WINDOW_READY';
    };
