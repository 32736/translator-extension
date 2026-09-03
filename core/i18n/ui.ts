import type { SupportedLanguage } from '../translator/types';

export type DisplayLanguage = 'zh' | 'en' | 'ja' | 'ko';

export interface UiCopy {
  appTitle: string;
  openSettings: string;
  settingsTitle: string;
  appearance: string;
  followSystem: string;
  light: string;
  dark: string;
  selection: string;
  enableSelection: string;
  localData: string;
  history: string;
  cache: string;
  clearCache: string;
  shortcuts: string;
  openShortcuts: string;
  themeSaved: string;
  selectionSaved: string;
  displayLanguage: string;
  chinese: string;
  english: string;
  japanese: string;
  korean: string;
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
  preparingTranslationModel: string;
  preparingLanguageModel: string;
  translating: string;
  retry: string;
  speakSource: string;
  speakTranslation: string;
  favorite: string;
  unfavorite: string;
  copy: string;
  copied: string;
  copyFailed: string;
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
    settingsTitle: '设置',
    appearance: '外观',
    followSystem: '跟随系统',
    light: '浅色',
    dark: '深色',
    selection: '网页划词',
    enableSelection: '启用划词按钮',
    localData: '本地数据',
    history: '历史记录',
    cache: '翻译缓存',
    clearCache: '清空缓存',
    shortcuts: '快捷键',
    openShortcuts: '打开 chrome://extensions/shortcuts',
    themeSaved: '主题设置已保存。',
    selectionSaved: '网页划词设置已保存。',
    displayLanguage: '页面显示语言',
    chinese: '中文',
    english: 'English',
    japanese: '日语',
    korean: '韩语',
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
    preparingTranslationModel: '正在准备本地翻译模型',
    preparingLanguageModel: '正在准备本地语言识别模型',
    translating: '正在翻译…',
    retry: '重试',
    speakSource: '播放原文',
    speakTranslation: '播放译文',
    favorite: '收藏',
    unfavorite: '取消收藏',
    copy: '复制',
    copied: '已复制',
    copyFailed: '复制失败',
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
    settingsTitle: 'Settings',
    appearance: 'Appearance',
    followSystem: 'Follow system',
    light: 'Light',
    dark: 'Dark',
    selection: 'Web selection',
    enableSelection: 'Enable selection button',
    localData: 'Local data',
    history: 'History',
    cache: 'Translation cache',
    clearCache: 'Clear cache',
    shortcuts: 'Shortcuts',
    openShortcuts: 'Open chrome://extensions/shortcuts',
    themeSaved: 'Theme settings saved.',
    selectionSaved: 'Web selection settings saved.',
    displayLanguage: 'Display language',
    chinese: '中文',
    english: 'English',
    japanese: 'Japanese',
    korean: 'Korean',
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
    preparingTranslationModel: 'Preparing the local translation model',
    preparingLanguageModel: 'Preparing the local language detection model',
    translating: 'Translating…',
    retry: 'Retry',
    speakSource: 'Play original',
    speakTranslation: 'Play translation',
    favorite: 'Favorite',
    unfavorite: 'Remove favorite',
    copy: 'Copy',
    copied: 'Copied',
    copyFailed: 'Copy failed',
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
  ja: {
    appTitle: '翻訳',
    openSettings: '設定を開く',
    settingsTitle: '設定',
    appearance: '外観',
    followSystem: 'システムに合わせる',
    light: 'ライト',
    dark: 'ダーク',
    selection: 'ウェブ選択',
    enableSelection: '選択翻訳ボタンを有効にする',
    localData: 'ローカルデータ',
    history: '履歴',
    cache: '翻訳キャッシュ',
    clearCache: 'キャッシュをクリア',
    shortcuts: 'ショートカット',
    openShortcuts: 'chrome://extensions/shortcuts を開く',
    themeSaved: 'テーマ設定を保存しました。',
    selectionSaved: 'ウェブ選択設定を保存しました。',
    displayLanguage: '表示言語',
    chinese: '中国語',
    english: '英語',
    japanese: '日本語',
    korean: '韓国語',
    sourceLanguage: '原文言語',
    targetLanguage: '翻訳先言語',
    autoDetect: '自動検出',
    swapLanguages: '言語を入れ替え',
    inputLabel: '原文',
    inputPlaceholder: '翻訳する文章を入力',
    clear: 'クリア',
    clearSource: '原文をクリア',
    translate: '翻訳',
    translation: '訳文',
    cancel: 'キャンセル',
    preparingTranslationModel: 'ローカル翻訳モデルを準備中',
    preparingLanguageModel: 'ローカル言語検出モデルを準備中',
    translating: '翻訳中…',
    retry: '再試行',
    speakSource: '原文を再生',
    speakTranslation: '訳文を再生',
    favorite: 'お気に入り',
    unfavorite: 'お気に入りから削除',
    copy: 'コピー',
    copied: 'コピーしました',
    copyFailed: 'コピーに失敗しました',
    recent: '最近',
    favorites: 'お気に入り',
    savedContent: '保存済みの内容',
    clearHistory: '履歴をクリア',
    clearFavorites: 'お気に入りをクリア',
    noHistory: '翻訳履歴はまだありません。',
    noFavorites: 'お気に入りはまだありません。',
    deleteHistory: (sourceText) => `履歴を削除：${sourceText}`,
    deleteFavorite: (sourceText) => `お気に入りから削除：${sourceText}`,
    cannotDetectLanguage: '入力言語を検出できません。原文言語を手動で選択してください。',
    invalidInput: '有効な翻訳内容を入力してください。',
    sameLanguage: '原文言語と翻訳先言語は異なる必要があります。',
    pairUnavailable: (pair) => `このバージョンでは${pair}に対応していません。`,
    apiUnsupported: '現在のChromeバージョンはローカル翻訳に対応していません。',
    deviceUnavailable: (pair) => `このデバイスでは${pair}のローカル翻訳モデルを利用できません。`,
    modelDownloadFailed: '翻訳モデルのダウンロードに失敗しました。',
    translationFailed: '翻訳に失敗しました。もう一度お試しください。',
    aborted: '翻訳をキャンセルしました。',
  },
  ko: {
    appTitle: '번역기',
    openSettings: '설정 열기',
    settingsTitle: '설정',
    appearance: '화면',
    followSystem: '시스템 설정 따르기',
    light: '밝게',
    dark: '어둡게',
    selection: '웹 선택',
    enableSelection: '선택 번역 버튼 사용',
    localData: '로컬 데이터',
    history: '기록',
    cache: '번역 캐시',
    clearCache: '캐시 지우기',
    shortcuts: '단축키',
    openShortcuts: 'chrome://extensions/shortcuts 열기',
    themeSaved: '화면 설정이 저장되었습니다.',
    selectionSaved: '웹 선택 설정이 저장되었습니다.',
    displayLanguage: '표시 언어',
    chinese: '중국어',
    english: '영어',
    japanese: '일본어',
    korean: '한국어',
    sourceLanguage: '원문 언어',
    targetLanguage: '번역 언어',
    autoDetect: '자동 감지',
    swapLanguages: '언어 바꾸기',
    inputLabel: '원문',
    inputPlaceholder: '번역할 텍스트 입력',
    clear: '지우기',
    clearSource: '원문 지우기',
    translate: '번역',
    translation: '번역문',
    cancel: '취소',
    preparingTranslationModel: '로컬 번역 모델 준비 중',
    preparingLanguageModel: '로컬 언어 감지 모델 준비 중',
    translating: '번역 중…',
    retry: '다시 시도',
    speakSource: '원문 재생',
    speakTranslation: '번역문 재생',
    favorite: '즐겨찾기',
    unfavorite: '즐겨찾기에서 삭제',
    copy: '복사',
    copied: '복사됨',
    copyFailed: '복사 실패',
    recent: '최근',
    favorites: '즐겨찾기',
    savedContent: '저장된 콘텐츠',
    clearHistory: '기록 지우기',
    clearFavorites: '즐겨찾기 지우기',
    noHistory: '아직 번역 기록이 없습니다.',
    noFavorites: '아직 즐겨찾기가 없습니다.',
    deleteHistory: (sourceText) => `기록 삭제: ${sourceText}`,
    deleteFavorite: (sourceText) => `즐겨찾기 삭제: ${sourceText}`,
    cannotDetectLanguage: '입력 언어를 감지할 수 없습니다. 원문 언어를 직접 선택하세요.',
    invalidInput: '번역할 내용을 입력하세요.',
    sameLanguage: '원문 언어와 번역 언어는 달라야 합니다.',
    pairUnavailable: (pair) => `${pair}은(는) 이 버전에서 지원되지 않습니다.`,
    apiUnsupported: '현재 Chrome 버전은 로컬 번역을 지원하지 않습니다.',
    deviceUnavailable: (pair) => `이 기기에서는 ${pair} 로컬 번역 모델을 사용할 수 없습니다.`,
    modelDownloadFailed: '번역 모델을 다운로드하지 못했습니다.',
    translationFailed: '번역에 실패했습니다. 다시 시도하세요.',
    aborted: '번역이 취소되었습니다.',
  },
};

const LANGUAGE_LABELS: Record<DisplayLanguage, Record<SupportedLanguage, string>> = {
  zh: {
    en: '英语',
    zh: '简体中文',
    ja: '日语',
    ko: '韩语',
  },
  en: {
    en: 'English',
    zh: 'Chinese',
    ja: 'Japanese',
    ko: 'Korean',
  },
  ja: {
    en: '英語',
    zh: '中国語（簡体字）',
    ja: '日本語',
    ko: '韓国語',
  },
  ko: {
    en: '영어',
    zh: '중국어(간체)',
    ja: '일본어',
    ko: '한국어',
  },
};

export function isDisplayLanguage(value: unknown): value is DisplayLanguage {
  return value === 'zh' || value === 'en' || value === 'ja' || value === 'ko';
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
