import type { TranslationSource } from '../translator/translation-types';

export interface PendingTranslation {
  id: string;
  text: string;
  source: Exclude<TranslationSource, 'window'>;
  createdAt: number;
}

const PENDING_TRANSLATION_KEY = 'pendingTranslation';
const MAX_PENDING_TRANSLATION_AGE_MS = 10 * 60 * 1000;

function isPendingTranslation(value: unknown): value is PendingTranslation {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const pending = value as Record<string, unknown>;
  return (
    typeof pending.id === 'string' &&
    typeof pending.text === 'string' &&
    (pending.source === 'selection' || pending.source === 'context-menu') &&
    typeof pending.createdAt === 'number'
  );
}

export async function queueTranslationRequest(
  text: string,
  source: PendingTranslation['source'],
): Promise<PendingTranslation> {
  const normalizedText = text.trim();

  if (!normalizedText) {
    throw new Error('Cannot queue an empty translation request');
  }

  const pending: PendingTranslation = {
    id: crypto.randomUUID(),
    text: normalizedText,
    source,
    createdAt: Date.now(),
  };
  await chrome.storage.session.set({
    [PENDING_TRANSLATION_KEY]: pending,
  });

  return pending;
}

export async function getPendingTranslation(): Promise<PendingTranslation | null> {
  const stored = await chrome.storage.session.get(PENDING_TRANSLATION_KEY);
  const value: unknown = stored[PENDING_TRANSLATION_KEY];

  if (!isPendingTranslation(value)) {
    return null;
  }

  if (Date.now() - value.createdAt > MAX_PENDING_TRANSLATION_AGE_MS) {
    await chrome.storage.session.remove(PENDING_TRANSLATION_KEY);
    return null;
  }

  return value;
}

export async function removePendingTranslation(id: string): Promise<void> {
  const pending = await getPendingTranslation();

  if (pending?.id === id) {
    await chrome.storage.session.remove(PENDING_TRANSLATION_KEY);
  }
}
