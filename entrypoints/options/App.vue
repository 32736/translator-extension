<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import {
  getUiCopy,
  type DisplayLanguage,
} from '../../core/i18n/ui';
import {
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
  type Settings,
} from '../../core/storage/settings';
import { IndexedDbCacheRepository } from '../../core/storage/cache-repository';
import { IndexedDbFavoriteRepository } from '../../core/storage/favorite-repository';
import { IndexedDbHistoryRepository } from '../../core/storage/history-repository';

const settings = ref<Settings>(DEFAULT_SETTINGS);
const statusMessage = ref('');
const displayLanguage = ref<DisplayLanguage>('zh');
const ui = computed(() => getUiCopy(displayLanguage.value));
const cacheRepository = new IndexedDbCacheRepository();
const historyRepository = new IndexedDbHistoryRepository();
const favoriteRepository = new IndexedDbFavoriteRepository();

function applyTheme(theme: Settings['theme']): void {
  document.documentElement.classList.remove('theme-light', 'theme-dark');

  if (theme !== 'system') {
    document.documentElement.classList.add(`theme-${theme}`);
  }
}

async function updateTheme(): Promise<void> {
  settings.value = await saveSettings({ theme: settings.value.theme });
  applyTheme(settings.value.theme);
  statusMessage.value = ui.value.themeSaved;
}

async function updateSelectionEnabled(): Promise<void> {
  settings.value = await saveSettings({
    selectionEnabled: settings.value.selectionEnabled,
  });
  statusMessage.value = ui.value.selectionSaved;
}

async function clearHistory(): Promise<void> {
  await historyRepository.clear();
  statusMessage.value = '历史已清空。';
}

async function clearCache(): Promise<void> {
  await cacheRepository.clear();
  statusMessage.value = '翻译缓存已清空。';
}

async function clearFavorites(): Promise<void> {
  await favoriteRepository.clear();
  statusMessage.value = '收藏已清空。';
}

function openShortcuts(): void {
  window.open('chrome://extensions/shortcuts', '_blank', 'noopener');
}

function applyDisplayLanguage(language: DisplayLanguage): void {
  document.documentElement.lang = {
    zh: 'zh-CN',
    en: 'en',
    ja: 'ja',
    ko: 'ko',
  }[language];
}

onMounted(() => {
  void loadSettings().then((loadedSettings) => {
    settings.value = loadedSettings;
    displayLanguage.value = loadedSettings.displayLanguage;
    applyDisplayLanguage(loadedSettings.displayLanguage);
    applyTheme(loadedSettings.theme);
  });
});
</script>

<template>
  <main class="settings-shell">
    <header class="settings-header">
      <p class="eyebrow">LOCAL-FIRST TRANSLATOR</p>
      <h1>{{ ui.settingsTitle }}</h1>
    </header>

    <section class="settings-section" aria-labelledby="appearance-title">
      <h2 id="appearance-title">{{ ui.appearance }}</h2>
      <label v-for="theme in [{ value: 'system', label: ui.followSystem }, { value: 'light', label: ui.light }, { value: 'dark', label: ui.dark }]" :key="theme.value" class="radio-row">
        <input v-model="settings.theme" type="radio" name="theme" :value="theme.value" @change="updateTheme" />
        <span>{{ theme.label }}</span>
      </label>
    </section>

    <section class="settings-section" aria-labelledby="selection-title">
      <h2 id="selection-title">{{ ui.selection }}</h2>
      <label class="checkbox-row">
        <input v-model="settings.selectionEnabled" type="checkbox" @change="updateSelectionEnabled" />
        <span>{{ ui.enableSelection }}</span>
      </label>
    </section>

    <section class="settings-section" aria-labelledby="data-title">
      <h2 id="data-title">{{ ui.localData }}</h2>
      <div class="action-row">
        <span>{{ ui.history }}</span>
        <button type="button" @click="clearHistory">{{ ui.clearHistory }}</button>
      </div>
      <div class="action-row">
        <span>{{ ui.cache }}</span>
        <button type="button" @click="clearCache">{{ ui.clearCache }}</button>
      </div>
      <div class="action-row">
        <span>{{ ui.favorites }}</span>
        <button type="button" @click="clearFavorites">{{ ui.clearFavorites }}</button>
      </div>
    </section>

    <section class="settings-section" aria-labelledby="shortcut-title">
      <h2 id="shortcut-title">{{ ui.shortcuts }}</h2>
      <button class="link-button" type="button" @click="openShortcuts">{{ ui.openShortcuts }}</button>
    </section>

    <p v-if="statusMessage" class="settings-status" role="status">{{ statusMessage }}</p>
  </main>
</template>
