<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
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
  isSettings,
  loadSettings,
  SETTINGS_KEY,
  type Settings,
} from '../../core/storage/settings';
import { ChromeTranslatorProvider } from '../../core/translator/chrome-translator-provider';
import { classifyText } from '../../core/language/classify';
import type { TextKind } from '../../core/language/types';
import type {
  TranslationRequest,
  TranslationSource,
} from '../../core/translator/translation-types';
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

const inputText = ref('');
const sourceText = ref('');
const translatedText = ref('');
const status = ref<TranslationStatus>('idle');
const progress = ref(0);
const errorMessage = ref('');
const copyLabel = ref('复制');
const favorited = ref(false);
const textKind = ref<TextKind | null>(null);
const activeSavedTab = ref<'history' | 'favorites'>('history');
const historyItems = ref<HistoryEntity[]>([]);
const favoriteItems = ref<FavoriteEntity[]>([]);
const settings = ref<Settings>({
  theme: 'system',
  selectionEnabled: true,
});

const provider = new ChromeTranslatorProvider();
const cacheRepository = new IndexedDbCacheRepository();
const historyRepository = new IndexedDbHistoryRepository();
const favoriteRepository = new IndexedDbFavoriteRepository();
const service = new TranslatorService(provider, cacheRepository, historyRepository);
let currentAbortController: AbortController | null = null;
let requestSequence = 0;

function isCurrentRequest(requestId: string): boolean {
  return requestId === `window-${requestSequence}`;
}

function textKindLabel(kind: TextKind | null): string {
  if (kind === 'word') {
    return '单词';
  }

  if (kind === 'phrase') {
    return '短语';
  }

  return kind === 'sentence' ? '句子' : '';
}

function applyTheme(theme: Settings['theme']): void {
  document.documentElement.classList.remove('theme-light', 'theme-dark');

  if (theme !== 'system') {
    document.documentElement.classList.add(`theme-${theme}`);
  }
}

function openOptions(): void {
  void chrome.runtime.openOptionsPage();
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
    settings.value = value;
    applyTheme(value.theme);
  }
}

async function refreshSavedData(): Promise<void> {
  const [history, favorites] = await Promise.all([
    historyRepository.list(30),
    favoriteRepository.list(30),
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
  copyLabel.value = '复制';

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
  textKind.value = classifyText(text);
  status.value = 'preparing-model';
  progress.value = 0;

  const request: TranslationRequest = {
    id: requestId,
    text,
    sourceLanguage: 'en',
    targetLanguage: 'zh',
    source,
    createdAt: Date.now(),
  };

  try {
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

    status.value = 'error';
    errorMessage.value =
      error instanceof TranslationServiceError
        ? error.details.message
        : '翻译失败，请重试。';
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
  textKind.value = null;
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
    await favoriteRepository.save({
      id,
      sourceText: sourceText.value,
      translatedText: translatedText.value,
      createdAt: Date.now(),
    });
  } else {
    await favoriteRepository.remove(id);
  }

  await refreshSavedData();
  await refreshFavoriteState();
}

function selectSavedItem(item: {
  sourceText: string;
  translatedText: string;
}): void {
  currentAbortController?.abort();
  currentAbortController = null;
  requestSequence += 1;
  inputText.value = item.sourceText;
  sourceText.value = item.sourceText;
  textKind.value = classifyText(item.sourceText);
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
    copyLabel.value = '已复制';
    window.setTimeout(() => {
      copyLabel.value = '复制';
    }, 1500);
  } catch {
    copyLabel.value = '复制失败';
  }
}

function speakSource(): void {
  if (!sourceText.value) {
    return;
  }

  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(sourceText.value);
  utterance.lang = 'en-US';
  speechSynthesis.speak(utterance);
}

onBeforeUnmount(() => {
  chrome.runtime.onMessage.removeListener(handleRuntimeMessage);
  chrome.storage.onChanged.removeListener(handleSettingsChanged);
  currentAbortController?.abort();
  speechSynthesis.cancel();
  provider.destroy();
});

onMounted(() => {
  chrome.runtime.onMessage.addListener(handleRuntimeMessage);
  chrome.storage.onChanged.addListener(handleSettingsChanged);
  void loadSettings().then((loadedSettings) => {
    settings.value = loadedSettings;
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
  void nextTick(() => {
    void translate(message.payload.source);
  });
}
</script>

<template>
  <main class="translator-shell">
    <header class="translator-header">
      <div>
        <p class="eyebrow">LOCAL-FIRST TRANSLATOR</p>
        <h1>Translator</h1>
      </div>
      <button class="settings-button" type="button" aria-label="打开设置" @click="openOptions">
        ⚙
      </button>
    </header>

    <section class="language-pair" aria-label="语言方向">
      English <span aria-hidden="true">→</span> 简体中文
    </section>

    <TranslationInput
      v-model="inputText"
      :disabled="status === 'preparing-model' || status === 'translating'"
      @translate="translate"
      @clear="clearInput"
      @paste="handlePaste"
    />

    <TranslationResult
      :source-text="sourceText"
      :translated-text="translatedText"
      :status="status"
      :progress="progress"
      :error-message="errorMessage"
      :copy-label="copyLabel"
      :favorited="favorited"
      :text-kind-label="textKindLabel(textKind)"
      @copy="copyTranslation"
      @speak="speakSource"
      @favorite="toggleFavorite"
      @retry="translate"
      @cancel="cancelTranslation"
    />

    <section class="saved-card" aria-label="历史与收藏">
      <div class="saved-tabs" role="tablist" aria-label="已保存内容">
        <button
          class="saved-tab"
          :class="{ active: activeSavedTab === 'history' }"
          type="button"
          role="tab"
          :aria-selected="activeSavedTab === 'history'"
          @click="activeSavedTab = 'history'"
        >
          历史
        </button>
        <button
          class="saved-tab"
          :class="{ active: activeSavedTab === 'favorites' }"
          type="button"
          role="tab"
          :aria-selected="activeSavedTab === 'favorites'"
          @click="activeSavedTab = 'favorites'"
        >
          收藏
        </button>
      </div>
      <HistoryList
        v-if="activeSavedTab === 'history'"
        :items="historyItems"
        @select="selectSavedItem"
      />
      <FavoriteList
        v-else
        :items="favoriteItems"
        @select="selectSavedItem"
      />
    </section>
  </main>
</template>
