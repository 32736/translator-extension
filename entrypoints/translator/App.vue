<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import FavoriteList from '../../components/FavoriteList.vue';
import HistoryList from '../../components/HistoryList.vue';
import TranslationInput from '../../components/TranslationInput.vue';
import TranslationResult from '../../components/TranslationResult.vue';
import type { RuntimeMessage } from '../../core/messaging/messages';
import {
  IndexedDbCacheRepository,
} from '../../core/storage/cache-repository';
import type { HistoryEntity } from '../../core/storage/history-repository';
import {
  IndexedDbHistoryRepository,
} from '../../core/storage/history-repository';
import type { FavoriteEntity } from '../../core/storage/favorite-repository';
import {
  createFavoriteId,
  IndexedDbFavoriteRepository,
} from '../../core/storage/favorite-repository';
import {
  getUiCopy,
  isDisplayLanguage,
  languageLabelForDisplay,
  type DisplayLanguage,
} from '../../core/i18n/ui';
import {
  isSettings,
  loadSettings,
  saveSettings,
  SETTINGS_KEY,
  type Settings,
} from '../../core/storage/settings';
import {
  ChromeLanguageDetector,
} from '../../core/language/language-detector';
import {
  isSupportedLanguage,
  isSupportedTranslationPair,
  languageSpeechLocale,
  SUPPORTED_LANGUAGES,
} from '../../core/translator/languages';
import { ChromeTranslatorProvider } from '../../core/translator/chrome-translator-provider';
import type {
  TranslationRequest,
  TranslationSource,
} from '../../core/translator/translation-types';
import type {
  SourceLanguage,
  TargetLanguage,
} from '../../core/translator/types';
import {
  normalizeText,
  TranslationServiceError,
  TranslatorService,
} from '../../core/translator/translator-service';

type TranslationStatus =
  | 'idle'
  | 'preparing-model'
  | 'translating'
  | 'success'
  | 'error';

type SavedTab = 'history' | 'favorites';

const inputText = ref('');
const sourceText = ref('');
const translatedText = ref('');
const status = ref<TranslationStatus>('idle');
const progress = ref(0);
const errorMessage = ref('');
const displayLanguage = ref<DisplayLanguage>('zh');
const ui = computed(() => getUiCopy(displayLanguage.value));
const preparingState = ref<'translation' | 'language-detection'>('translation');
const preparingLabel = computed(() =>
  preparingState.value === 'language-detection'
    ? ui.value.preparingLanguageModel
    : ui.value.preparingTranslationModel,
);
const copyState = ref<'copy' | 'copied' | 'failed'>('copy');
const copyLabel = computed(() => {
  if (copyState.value === 'copied') {
    return ui.value.copied;
  }

  if (copyState.value === 'failed') {
    return ui.value.copyFailed;
  }

  return ui.value.copy;
});
const favorited = ref(false);
const activeSavedTab = ref<SavedTab>('history');
const historyItems = ref<HistoryEntity[]>([]);
const favoriteItems = ref<FavoriteEntity[]>([]);
const sourceLanguage = ref<SourceLanguage | 'auto'>('auto');
const targetLanguage = ref<TargetLanguage>('zh');
const detectedLanguage = ref<SourceLanguage | null>(null);
const supportedLanguages = SUPPORTED_LANGUAGES;
const availableTargetLanguages: readonly TargetLanguage[] =
  SUPPORTED_LANGUAGES.map((language) => language.code);
const sourceSpeechLanguage = computed<SourceLanguage | null>(() => {
  const text = normalizeText(inputText.value);

  if (!text) {
    return null;
  }

  if (sourceLanguage.value !== 'auto') {
    return sourceLanguage.value;
  }

  return text === sourceText.value ? detectedLanguage.value : null;
});
const canSpeakSource = computed(
  () =>
    sourceSpeechLanguage.value !== null &&
    status.value !== 'preparing-model' &&
    status.value !== 'translating',
);
const settings = ref<Settings>({
  theme: 'system',
  selectionEnabled: true,
  displayLanguage: 'zh',
});
const activeSavedItems = computed(() =>
  activeSavedTab.value === 'history'
    ? historyItems.value
    : favoriteItems.value,
);
const activeSavedClearLabel = computed(() =>
  activeSavedTab.value === 'history'
    ? ui.value.clearHistory
    : ui.value.clearFavorites,
);

const provider = new ChromeTranslatorProvider();
const cacheRepository = new IndexedDbCacheRepository();
const historyRepository = new IndexedDbHistoryRepository();
const favoriteRepository = new IndexedDbFavoriteRepository();
const languageDetector = new ChromeLanguageDetector();
const service = new TranslatorService(
  provider,
  cacheRepository,
  historyRepository,
);
let currentAbortController: AbortController | null = null;
let requestSequence = 0;
const savedTabOrder: readonly SavedTab[] = ['history', 'favorites'];

function selectSavedTab(tab: SavedTab): void {
  activeSavedTab.value = tab;
}

function handleSavedTabKeydown(event: KeyboardEvent, currentTab: SavedTab): void {
  const currentIndex = savedTabOrder.indexOf(currentTab);
  let nextIndex: number;

  switch (event.key) {
    case 'ArrowRight':
    case 'ArrowDown':
      nextIndex = (currentIndex + 1) % savedTabOrder.length;
      break;
    case 'ArrowLeft':
    case 'ArrowUp':
      nextIndex = (currentIndex - 1 + savedTabOrder.length) % savedTabOrder.length;
      break;
    case 'Home':
      nextIndex = 0;
      break;
    case 'End':
      nextIndex = savedTabOrder.length - 1;
      break;
    default:
      return;
  }

  const nextTab = savedTabOrder[nextIndex];

  if (nextTab === undefined) {
    return;
  }

  event.preventDefault();
  selectSavedTab(nextTab);
  void nextTick(() => {
    document.getElementById(`saved-tab-${nextTab}`)?.focus();
  });
}

function isCurrentRequest(requestId: string): boolean {
  return requestId === `window-${requestSequence}`;
}

function clearTranslationState(): void {
  currentAbortController?.abort();
  currentAbortController = null;
  requestSequence += 1;
  sourceText.value = '';
  translatedText.value = '';
  status.value = 'idle';
  errorMessage.value = '';
  progress.value = 0;
  preparingState.value = 'translation';
  favorited.value = false;
}

function setSourceLanguage(value: string): void {
  if (value === 'auto') {
    sourceLanguage.value = 'auto';
    detectedLanguage.value = null;
    clearTranslationState();
    return;
  }

  if (!isSupportedLanguage(value)) {
    return;
  }

  sourceLanguage.value = value;
  detectedLanguage.value = null;
  clearTranslationState();
}

function setTargetLanguage(value: string): void {
  if (!isSupportedLanguage(value)) {
    return;
  }

  targetLanguage.value = value;
  detectedLanguage.value = null;
  clearTranslationState();
}

function swapLanguages(): void {
  if (sourceLanguage.value === 'auto') {
    return;
  }

  const previousSource = sourceLanguage.value;
  if (!isSupportedTranslationPair(targetLanguage.value, previousSource)) {
    return;
  }

  sourceLanguage.value = targetLanguage.value;
  targetLanguage.value = previousSource;
  detectedLanguage.value = null;
  clearTranslationState();
}

function applyTheme(theme: Settings['theme']): void {
  document.documentElement.classList.remove('theme-light', 'theme-dark');

  if (theme !== 'system') {
    document.documentElement.classList.add(`theme-${theme}`);
  }
}

function applyDisplayLanguage(language: DisplayLanguage): void {
  document.documentElement.lang = {
    zh: 'zh-CN',
    en: 'en',
    ja: 'ja',
    ko: 'ko',
  }[language];
}

function getTargetLanguageForDisplay(
  language: DisplayLanguage,
): TargetLanguage {
  return language === 'en' ? 'en' : 'zh';
}

function openOptions(): void {
  void chrome.runtime.openOptionsPage();
}

async function setDisplayLanguage(language: DisplayLanguage): Promise<void> {
  if (displayLanguage.value === language) {
    return;
  }

  const savedSettings = await saveSettings({ displayLanguage: language });
  settings.value = savedSettings;
  displayLanguage.value = savedSettings.displayLanguage;
  applyDisplayLanguage(savedSettings.displayLanguage);
  targetLanguage.value = getTargetLanguageForDisplay(
    savedSettings.displayLanguage,
  );
  clearTranslationState();
}

function handleDisplayLanguageChange(value: string): void {
  if (!isDisplayLanguage(value)) {
    return;
  }

  void setDisplayLanguage(value);
}

function getTranslationPairForDisplay(): string {
  const resolvedSourceLanguage =
    sourceLanguage.value === 'auto'
      ? detectedLanguage.value
      : sourceLanguage.value;

  if (resolvedSourceLanguage === null) {
    return '';
  }

  return `${languageLabelForDisplay(resolvedSourceLanguage, displayLanguage.value)} → ${languageLabelForDisplay(targetLanguage.value, displayLanguage.value)}`;
}

function getLocalizedErrorMessage(error: unknown): string {
  if (!(error instanceof TranslationServiceError)) {
    return ui.value.translationFailed;
  }

  switch (error.details.code) {
    case 'INVALID_INPUT':
      return sourceLanguage.value !== 'auto' &&
        sourceLanguage.value === targetLanguage.value
        ? ui.value.sameLanguage
        : ui.value.invalidInput;
    case 'PAIR_UNAVAILABLE': {
      const pair = getTranslationPairForDisplay();
      return pair === '' ? ui.value.translationFailed : ui.value.pairUnavailable(pair);
    }
    case 'API_UNSUPPORTED':
      return ui.value.apiUnsupported;
    case 'MODEL_DOWNLOAD_FAILED':
      return ui.value.modelDownloadFailed;
    case 'ABORTED':
      return ui.value.aborted;
    case 'TRANSLATION_FAILED':
      return ui.value.translationFailed;
    default:
      return ui.value.translationFailed;
  }
}

function handleSettingsChanged(
  changes: { [key: string]: chrome.storage.StorageChange },
  areaName: string,
): void {
  if (areaName !== 'sync') {
    return;
  }

  const value: unknown = changes[SETTINGS_KEY]?.newValue;

  if (isSettings(value)) {
    const displayLanguageChanged =
      displayLanguage.value !== value.displayLanguage;
    settings.value = value;
    applyTheme(value.theme);

    if (displayLanguageChanged) {
      displayLanguage.value = value.displayLanguage;
      applyDisplayLanguage(value.displayLanguage);
      targetLanguage.value = getTargetLanguageForDisplay(value.displayLanguage);
      clearTranslationState();
    }
  }
}

async function refreshSavedData(): Promise<void> {
  const [history, favorites] = await Promise.all([
    historyRepository.list(5),
    favoriteRepository.list(5),
  ]);
  historyItems.value = history;
  favoriteItems.value = favorites;
}

async function refreshFavoriteState(): Promise<void> {
  if (!sourceText.value || !translatedText.value) {
    favorited.value = false;
    return;
  }

  const id = await createFavoriteId(sourceText.value, translatedText.value);
  favorited.value = (await favoriteRepository.get(id)) !== null;
}

async function translate(source: TranslationSource = 'window'): Promise<void> {
  const text = normalizeText(inputText.value);

  currentAbortController?.abort();
  currentAbortController = null;
  translatedText.value = '';
  errorMessage.value = '';
  copyState.value = 'copy';

  if (!text) {
    sourceText.value = '';
    status.value = 'idle';
    progress.value = 0;
    return;
  }

  const requestId = `window-${++requestSequence}`;
  const abortController = new AbortController();
  currentAbortController = abortController;
  sourceText.value = text;
  status.value = 'preparing-model';
  progress.value = 0;
  preparingState.value = 'translation';
  if (sourceLanguage.value === 'auto') {
    detectedLanguage.value = null;
  }

  try {
    let resolvedSourceLanguage: SourceLanguage;
    let resolvedTargetLanguage: TargetLanguage;

    if (sourceLanguage.value === 'auto') {
      const detected = await languageDetector.detect(text, {
        onDownloadProgress: (downloadProgress) => {
          if (isCurrentRequest(requestId)) {
            status.value = 'preparing-model';
            preparingState.value = 'language-detection';
            progress.value = downloadProgress;
          }
        },
      });

      if (!isCurrentRequest(requestId)) {
        return;
      }

      if (detected === null) {
        status.value = 'error';
        errorMessage.value = ui.value.cannotDetectLanguage;
        return;
      }

      detectedLanguage.value = detected;
      resolvedSourceLanguage = detected;
      resolvedTargetLanguage = targetLanguage.value;
    } else {
      resolvedSourceLanguage = sourceLanguage.value;
      resolvedTargetLanguage = targetLanguage.value;
    }

    preparingState.value = 'translation';

    const request: TranslationRequest = {
      id: requestId,
      text,
      sourceLanguage: resolvedSourceLanguage,
      targetLanguage: resolvedTargetLanguage,
      source,
      createdAt: Date.now(),
    };

    const result = await service.translate(request, {
      signal: abortController.signal,
      onDownloadProgress: (downloadProgress) => {
        if (isCurrentRequest(requestId)) {
          status.value = 'preparing-model';
          progress.value = downloadProgress;
        }
      },
      onTranslating: () => {
        if (isCurrentRequest(requestId)) {
          status.value = 'translating';
        }
      },
    });

    if (!isCurrentRequest(requestId)) {
      return;
    }

    translatedText.value = result.translatedText;
    status.value = 'success';
    void refreshSavedData();
    void refreshFavoriteState();
  } catch (error: unknown) {
    if (!isCurrentRequest(requestId)) {
      return;
    }

    if (
      error instanceof TranslationServiceError &&
      error.details.code === 'ABORTED'
    ) {
      status.value = 'idle';
      return;
    }

    if (
      abortController.signal.aborted ||
      (error instanceof DOMException && error.name === 'AbortError') ||
      (error instanceof Error && error.name === 'AbortError')
    ) {
      status.value = 'idle';
      return;
    }

    status.value = 'error';
    errorMessage.value = getLocalizedErrorMessage(error);
  } finally {
    if (isCurrentRequest(requestId)) {
      currentAbortController = null;
    }
  }
}

function clearInput(): void {
  currentAbortController?.abort();
  currentAbortController = null;
  requestSequence += 1;
  inputText.value = '';
  sourceText.value = '';
  translatedText.value = '';
  status.value = 'idle';
  errorMessage.value = '';
  progress.value = 0;
  favorited.value = false;
  detectedLanguage.value = null;
}

function cancelTranslation(): void {
  currentAbortController?.abort();
}

async function toggleFavorite(): Promise<void> {
  if (!sourceText.value || !translatedText.value) {
    return;
  }

  const id = await createFavoriteId(sourceText.value, translatedText.value);
  const existing = await favoriteRepository.get(id);

  if (existing === null) {
    const favoriteSourceLanguage =
      sourceLanguage.value === 'auto'
        ? detectedLanguage.value
        : sourceLanguage.value;
    const favoriteTargetLanguage = targetLanguage.value;

    await favoriteRepository.save({
      id,
      sourceText: sourceText.value,
      translatedText: translatedText.value,
      ...(favoriteSourceLanguage !== null && favoriteTargetLanguage !== null
        ? {
            sourceLanguage: favoriteSourceLanguage,
            targetLanguage: favoriteTargetLanguage,
          }
        : {}),
      createdAt: Date.now(),
    });
  } else {
    await favoriteRepository.remove(id);
  }

  await refreshSavedData();
  await refreshFavoriteState();
}

async function clearHistory(): Promise<void> {
  await historyRepository.clear();
  await refreshSavedData();
}

async function clearFavorites(): Promise<void> {
  await favoriteRepository.clear();
  await refreshSavedData();
  await refreshFavoriteState();
}

async function deleteHistoryItem(item: HistoryEntity): Promise<void> {
  await historyRepository.remove(item.id);
  await refreshSavedData();
}

async function deleteFavoriteItem(item: FavoriteEntity): Promise<void> {
  await favoriteRepository.remove(item.id);
  await refreshSavedData();
  await refreshFavoriteState();
}

function clearActiveSaved(): void {
  if (activeSavedTab.value === 'history') {
    void clearHistory();
    return;
  }

  void clearFavorites();
}

function selectSavedItem(item: {
  sourceText: string;
  translatedText: string;
  sourceLanguage?: SourceLanguage;
  targetLanguage?: TargetLanguage;
}): void {
  currentAbortController?.abort();
  currentAbortController = null;
  requestSequence += 1;
  inputText.value = item.sourceText;
  sourceLanguage.value = item.sourceLanguage ?? 'auto';
  targetLanguage.value = item.targetLanguage ?? 'zh';
  detectedLanguage.value = null;
  sourceText.value = item.sourceText;
  translatedText.value = item.translatedText;
  status.value = 'success';
  errorMessage.value = '';
  progress.value = 0;
  void refreshFavoriteState();
}

async function handlePaste(): Promise<void> {
  await nextTick();
  window.setTimeout(() => {
    void translate();
  }, 0);
}

async function copyTranslation(): Promise<void> {
  if (!translatedText.value) {
    return;
  }

  try {
    await navigator.clipboard.writeText(translatedText.value);
    copyState.value = 'copied';
    window.setTimeout(() => {
      copyState.value = 'copy';
    }, 1500);
  } catch {
    copyState.value = 'failed';
  }
}

function speakText(text: string, language: SourceLanguage | TargetLanguage): void {
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = languageSpeechLocale(language);
  speechSynthesis.speak(utterance);
}

function speakSource(): void {
  const text = normalizeText(inputText.value);
  const speechLanguage = sourceSpeechLanguage.value;

  if (!text || speechLanguage === null) {
    return;
  }

  speakText(text, speechLanguage);
}

function speakTranslation(): void {
  if (!translatedText.value) {
    return;
  }

  speakText(translatedText.value, targetLanguage.value);
}

onBeforeUnmount(() => {
  chrome.runtime.onMessage.removeListener(handleRuntimeMessage);
  chrome.storage.onChanged.removeListener(handleSettingsChanged);
  currentAbortController?.abort();
  speechSynthesis.cancel();
  provider.destroy();
  languageDetector.destroy();
});

onMounted(() => {
  chrome.runtime.onMessage.addListener(handleRuntimeMessage);
  chrome.storage.onChanged.addListener(handleSettingsChanged);
  void loadSettings().then((loadedSettings) => {
    settings.value = loadedSettings;
    displayLanguage.value = loadedSettings.displayLanguage;
    applyDisplayLanguage(loadedSettings.displayLanguage);
    targetLanguage.value = getTargetLanguageForDisplay(
      loadedSettings.displayLanguage,
    );
    applyTheme(loadedSettings.theme);
  });
  void refreshSavedData();
  const readyMessage: RuntimeMessage = { type: 'TRANSLATOR_WINDOW_READY' };
  void chrome.runtime.sendMessage(readyMessage).catch(() => {
    // The background may be restarting while the page becomes ready.
  });
});

function handleRuntimeMessage(message: RuntimeMessage): void {
  if (message.type !== 'TRANSLATE_IN_WINDOW') {
    return;
  }

  inputText.value = message.payload.text;
  sourceLanguage.value = 'auto';
  detectedLanguage.value = null;
  void nextTick(() => {
    void translate(message.payload.source);
  });
}
</script>

<template>
  <main class="translator-shell">
    <header class="translator-header">
      <h1 class="sr-only">{{ ui.appTitle }}</h1>
      <label class="sr-only" for="display-language-select">
        {{ ui.displayLanguage }}
      </label>
      <select
        id="display-language-select"
        class="display-language-select"
        :value="displayLanguage"
        :aria-label="ui.displayLanguage"
        @change="handleDisplayLanguageChange(($event.target as HTMLSelectElement).value)"
      >
        <option value="zh">{{ ui.chinese }}</option>
        <option value="en">{{ ui.english }}</option>
        <option value="ja">{{ ui.japanese }}</option>
        <option value="ko">{{ ui.korean }}</option>
      </select>
      <button
        class="settings-button"
        type="button"
        :aria-label="ui.openSettings"
        :title="ui.openSettings"
        @click="openOptions"
      >
        <span aria-hidden="true">⚙</span>
      </button>
    </header>

    <section
      class="language-switcher"
      :aria-label="`${ui.sourceLanguage} / ${ui.targetLanguage}`"
    >
      <div class="language-side">
        <span class="language-caption">{{ ui.sourceLanguage }}</span>
        <select
          :value="sourceLanguage"
          class="language-select"
          :aria-label="ui.sourceLanguage"
          @change="setSourceLanguage(($event.target as HTMLSelectElement).value)"
        >
          <option value="auto">{{ ui.autoDetect }}</option>
          <option
            v-for="language in supportedLanguages"
            :key="language.code"
            :value="language.code"
          >
            {{ languageLabelForDisplay(language.code, displayLanguage) }}
          </option>
        </select>
      </div>
      <button
        v-if="sourceLanguage !== 'auto' && isSupportedTranslationPair(targetLanguage, sourceLanguage)"
        class="language-swap"
        type="button"
        :aria-label="ui.swapLanguages"
        :title="ui.swapLanguages"
        @click="swapLanguages"
      >
        <span aria-hidden="true">↔</span>
      </button>
      <div class="language-side language-side-target">
        <span class="language-caption">{{ ui.targetLanguage }}</span>
        <select
          :value="targetLanguage"
          class="language-select"
          :aria-label="ui.targetLanguage"
          @change="setTargetLanguage(($event.target as HTMLSelectElement).value)"
        >
          <option
            v-for="language in availableTargetLanguages"
            :key="language"
            :value="language"
          >
            {{ languageLabelForDisplay(language, displayLanguage) }}
          </option>
        </select>
      </div>
    </section>

    <section class="translation-surface" :aria-label="ui.translation">
      <TranslationInput
        v-model="inputText"
        :disabled="status === 'preparing-model' || status === 'translating'"
        :can-speak-source="canSpeakSource"
        :display-language="displayLanguage"
        @translate="translate"
        @clear="clearInput"
        @speak="speakSource"
        @paste="handlePaste"
      />

      <TranslationResult
        :translated-text="translatedText"
        :status="status"
        :progress="progress"
        :error-message="errorMessage"
        :preparing-label="preparingLabel"
        :copy-label="copyLabel"
        :favorited="favorited"
        :display-language="displayLanguage"
        @copy="copyTranslation"
        @speak="speakTranslation"
        @favorite="toggleFavorite"
        @retry="translate"
        @cancel="cancelTranslation"
      />
    </section>

    <section
      class="saved-section"
      :aria-label="`${ui.recent} / ${ui.favorites}`"
    >
      <div class="saved-heading">
        <div class="saved-tabs" role="tablist" :aria-label="ui.savedContent">
          <button
            id="saved-tab-history"
            class="saved-tab"
            :class="{ active: activeSavedTab === 'history' }"
            type="button"
            role="tab"
            :aria-selected="activeSavedTab === 'history'"
            aria-controls="saved-panel-history"
            :tabindex="activeSavedTab === 'history' ? 0 : -1"
            @click="selectSavedTab('history')"
            @keydown="handleSavedTabKeydown($event, 'history')"
          >
            {{ ui.recent }}
          </button>
          <button
            id="saved-tab-favorites"
            class="saved-tab"
            :class="{ active: activeSavedTab === 'favorites' }"
            type="button"
            role="tab"
            :aria-selected="activeSavedTab === 'favorites'"
            aria-controls="saved-panel-favorites"
            :tabindex="activeSavedTab === 'favorites' ? 0 : -1"
            @click="selectSavedTab('favorites')"
            @keydown="handleSavedTabKeydown($event, 'favorites')"
          >
            {{ ui.favorites }}
          </button>
        </div>
        <button
          class="saved-clear-button"
          type="button"
          :disabled="activeSavedItems.length === 0"
          :aria-label="activeSavedClearLabel"
          :title="activeSavedClearLabel"
          @click="clearActiveSaved"
        >
          {{ ui.clear }}
        </button>
      </div>
      <div
        v-if="activeSavedTab === 'history'"
        id="saved-panel-history"
        class="saved-panel"
        role="tabpanel"
        aria-labelledby="saved-tab-history"
      >
        <HistoryList
          :items="historyItems"
          :display-language="displayLanguage"
          @select="selectSavedItem"
          @delete="deleteHistoryItem"
        />
      </div>
      <div
        v-else
        id="saved-panel-favorites"
        class="saved-panel"
        role="tabpanel"
        aria-labelledby="saved-tab-favorites"
      >
        <FavoriteList
          :items="favoriteItems"
          :display-language="displayLanguage"
          @select="selectSavedItem"
          @delete="deleteFavoriteItem"
        />
      </div>
    </section>
  </main>
</template>
