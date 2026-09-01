import type { TextKind } from './types';

export function classifyText(text: string): TextKind {
  const value = text.trim();

  if (/^[A-Za-z][A-Za-z'-]*$/.test(value)) {
    return 'word';
  }

  if (value.length <= 80 && !/[.!?。！？]$/.test(value)) {
    return 'phrase';
  }

  return 'sentence';
}

export function containsMostlyChinese(text: string): boolean {
  const value = text.trim();
  const chineseCount = (value.match(/[\u3400-\u9fff]/g) ?? []).length;
  const latinCount = (value.match(/[A-Za-z]/g) ?? []).length;

  return chineseCount >= 2 && chineseCount >= latinCount;
}
