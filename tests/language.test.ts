import { describe, expect, it } from 'vitest';
import { classifyText, containsMostlyChinese } from '../core/language/classify';

describe('text classification', () => {
  it('classifies words, phrases, and sentences', () => {
    expect(classifyText('deprecated')).toBe('word');
    expect(classifyText('render pipeline')).toBe('phrase');
    expect(classifyText('This API has been deprecated.')).toBe('sentence');
  });

  it('detects mostly Chinese input', () => {
    expect(containsMostlyChinese('这是中文')).toBe(true);
    expect(containsMostlyChinese('This is English')).toBe(false);
  });
});
