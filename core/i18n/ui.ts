import type { SupportedLanguage } from '../translator/types';

export type DisplayLanguage = 'zh' | 'en';

export interface UiCopy {
  appTitle: string;
  openSettings: string;
  displayLanguage: string;
  chinese: string;
  english: string;
  sourceLanguage: string;
  targetLanguage: string;
  autoDetect: string;
  swapLanguages: string;
  inputLabel: string;
  inputPlaceholder: string;
  clear: string;
  clearSource: string;
  translate: string;
  translation: string;
  cancel: string;
  resultPlaceholder: string;
  preparingTranslationModel: string;
  preparingLanguageModel: string;
  translating: string;
  retry: string;
  speak: string;
  favorite: string;
  unfavorite: string;
  copy: string;
  copied: string;
  copyFailed: string;
  word: string;
  phrase: string;
  sentence: string;
  recent: string;
  favorites: string;
  savedContent: string;
  clearHistory: string;
  clearFavorites: string;
  noHistory: string;
  noFavorites: string;
  deleteHistory: (sourceText: string) => string;
  deleteFavorite: (sourceText: string) => string;
  cannotDetectLanguage: string;
  invalidInput: string;
  sameLanguage: string;
  pairUnavailable: (pair: string) => string;
  apiUnsupported: string;
  deviceUnavailable: (pair: string) => string;
  modelDownloadFailed: string;
  translationFailed: string;
  aborted: string;
}

const UI_COPY: Record<DisplayLanguage, UiCopy> = {
  zh: {
    appTitle: '翻译器',
    openSettings: '打开设置',
    displayLanguage: '页面显示语言',
    chinese: '中文',
    english: 'English',
    sourceLanguage: '源语言',
    targetLanguage: '目标语言',
    autoDetect: '自动检测',
    swapLanguages: '交换语言方向',
    inputLabel: '原文',
    inputPlaceholder: '输入要翻译的文字',
    clear: '清空',
    clearSource: '清空原文',
    translate: '翻译',
    translation: '译文',
    cancel: '取消',
    resultPlaceholder: '译文会显示在这里',
    preparingTranslationModel: '正在准备本地翻译模型',
    preparingLanguageModel: '正在准备本地语言识别模型',
    translating: '正在翻译…',
    retry: '重试',
    speak: '发音',
    favorite: '收藏',
    unfavorite: '取消收藏',
    copy: '复制',
    copied: '已复制',
    copyFailed: '复制失败',
    word: '单词',
    phrase: '短语',
    sentence: '句子',
    recent: '最近',
    favorites: '收藏',
    savedContent: '已保存内容',
    clearHistory: '清空历史',
    clearFavorites: '清空收藏',
    noHistory: '还没有翻译历史。',
    noFavorites: '还没有收藏内容。',
    deleteHistory: (sourceText) => `删除历史：${sourceText}`,
    deleteFavorite: (sourceText) => `删除收藏：${sourceText}`,
    cannotDetectLanguage: '无法识别输入语言，请手动选择源语言。',
    invalidInput: '请输入有效的翻译内容。',
    sameLanguage: '源语言和目标语言不能相同。',
    pairUnavailable: (pair) => `当前版本暂不支持${pair}。`,
    apiUnsupported: '当前 Chrome 版本不支持本地翻译。',
    deviceUnavailable: (pair) => `当前设备无法使用${pair}本地翻译模型。`,
    modelDownloadFailed: '翻译模型下载失败。',
    translationFailed: '翻译失败，请重试。',
    aborted: '翻译已取消。',
  },
  en: {
    appTitle: 'Translator',
    openSettings: 'Open settings',
    displayLanguage: 'Display language',
    chinese: '中文',
    english: 'English',
    sourceLanguage: 'Source',
    targetLanguage: 'Target',
    autoDetect: 'Auto detect',
    swapLanguages: 'Swap languages',
    inputLabel: 'Original',
    inputPlaceholder: 'Enter text to translate',
    clear: 'Clear',
    clearSource: 'Clear original text',
    translate: 'Translate',
    translation: 'Translation',
    cancel: 'Cancel',
    resultPlaceholder: 'Your translation will appear here',
    preparingTranslationModel: 'Preparing the local translation model',
    preparingLanguageModel: 'Preparing the local language detection model',
    translating: 'Translating…',
    retry: 'Retry',
    speak: 'Speak',
    favorite: 'Favorite',
    unfavorite: 'Remove favorite',
    copy: 'Copy',
    copied: 'Copied',
    copyFailed: 'Copy failed',
    word: 'Word',
    phrase: 'Phrase',
    sentence: 'Sentence',
    recent: 'Recent',
    favorites: 'Favorites',
    savedContent: 'Saved content',
    clearHistory: 'Clear history',
    clearFavorites: 'Clear favorites',
    noHistory: 'No translation history yet.',
    noFavorites: 'No favorites yet.',
    deleteHistory: (sourceText) => `Delete history: ${sourceText}`,
    deleteFavorite: (sourceText) => `Remove favorite: ${sourceText}`,
    cannotDetectLanguage: 'Unable to detect the input language. Select a source language manually.',
    invalidInput: 'Enter valid text to translate.',
    sameLanguage: 'Source and target languages must be different.',
    pairUnavailable: (pair) => `${pair} is not supported in this version.`,
    apiUnsupported: 'This Chrome version does not support local translation.',
    deviceUnavailable: (pair) => `This device cannot use the local ${pair} translation model.`,
    modelDownloadFailed: 'The translation model download failed.',
    translationFailed: 'Translation failed. Please try again.',
    aborted: 'Translation canceled.',
  },
};

const LANGUAGE_LABELS: Record<DisplayLanguage, Record<SupportedLanguage, string>> = {
  zh: {
    en: 'English',
    zh: '简体中文',
    ja: '日本語',
    ko: '한국어',
  },
  en: {
    en: 'English',
    zh: 'Chinese',
    ja: 'Japanese',
    ko: 'Korean',
  },
};

export function isDisplayLanguage(value: unknown): value is DisplayLanguage {
  return value === 'zh' || value === 'en';
}

export function getUiCopy(language: DisplayLanguage): UiCopy {
  return UI_COPY[language];
}

export function languageLabelForDisplay(
  language: SupportedLanguage,
  displayLanguage: DisplayLanguage,
): string {
  return LANGUAGE_LABELS[displayLanguage][language];
}
