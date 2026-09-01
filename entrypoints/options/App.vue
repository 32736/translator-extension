<script setup lang="ts">
import { onMounted, ref } from 'vue';
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
const cacheRepository = new IndexedDbCacheRepository();
const historyRepository = new IndexedDbHistoryRepository();
const favoriteRepository = new IndexedDbFavoriteRepository();

async function updateTheme(): Promise<void> {
  settings.value = await saveSettings({ theme: settings.value.theme });
  statusMessage.value = '主题设置已保存。';
}

async function updateSelectionEnabled(): Promise<void> {
  settings.value = await saveSettings({
    selectionEnabled: settings.value.selectionEnabled,
  });
  statusMessage.value = '网页划词设置已保存。';
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

onMounted(() => {
  void loadSettings().then((loadedSettings) => {
    settings.value = loadedSettings;
  });
});
</script>

<template>
  <main class="settings-shell">
    <header class="settings-header">
      <p class="eyebrow">LOCAL-FIRST TRANSLATOR</p>
      <h1>设置</h1>
    </header>

    <section class="settings-section" aria-labelledby="appearance-title">
      <h2 id="appearance-title">外观</h2>
      <label v-for="theme in [{ value: 'system', label: '跟随系统' }, { value: 'light', label: '浅色' }, { value: 'dark', label: '深色' }]" :key="theme.value" class="radio-row">
        <input v-model="settings.theme" type="radio" name="theme" :value="theme.value" @change="updateTheme" />
        <span>{{ theme.label }}</span>
      </label>
    </section>

    <section class="settings-section" aria-labelledby="selection-title">
      <h2 id="selection-title">网页划词</h2>
      <label class="checkbox-row">
        <input v-model="settings.selectionEnabled" type="checkbox" @change="updateSelectionEnabled" />
        <span>启用划词按钮</span>
      </label>
    </section>

    <section class="settings-section" aria-labelledby="data-title">
      <h2 id="data-title">本地数据</h2>
      <div class="action-row">
        <span>历史记录</span>
        <button type="button" @click="clearHistory">清空历史</button>
      </div>
      <div class="action-row">
        <span>翻译缓存</span>
        <button type="button" @click="clearCache">清空缓存</button>
      </div>
      <div class="action-row">
        <span>收藏</span>
        <button type="button" @click="clearFavorites">清空收藏</button>
      </div>
    </section>

    <section class="settings-section" aria-labelledby="shortcut-title">
      <h2 id="shortcut-title">快捷键</h2>
      <button class="link-button" type="button" @click="openShortcuts">打开 chrome://extensions/shortcuts</button>
    </section>

    <p v-if="statusMessage" class="settings-status" role="status">{{ statusMessage }}</p>
  </main>
</template>
