import { createApp } from 'vue';
import App from './App.vue';
import './style.css';
import { loadSettings } from '../../core/storage/settings';
import { loadUiCopy } from '../../core/i18n/ui';

async function mountOptions(): Promise<void> {
  const settings = await loadSettings();
  await loadUiCopy(settings.displayLanguage);
  createApp(App, { initialSettings: settings }).mount('#app');
}

void mountOptions();
