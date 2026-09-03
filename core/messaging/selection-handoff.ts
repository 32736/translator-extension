import type { RuntimeMessage } from './messages';

export function createSelectionTranslationMessage(
  text: string,
  tooLong: boolean,
): RuntimeMessage | null {
  const normalizedText = text.trim();

  if (tooLong || !normalizedText) {
    return null;
  }

  return {
    type: 'TRANSLATE_IN_WINDOW',
    payload: {
      text: normalizedText,
      source: 'selection',
    },
  };
}
