<script setup lang="ts">
import { computed } from 'vue';
import TranslationStatus from './TranslationStatus.vue';
import {
  getUiCopy,
  type DisplayLanguage,
} from '../core/i18n/ui';

const props = defineProps<{
  sourceText: string;
  translatedText: string;
  status: 'idle' | 'preparing-model' | 'translating' | 'success' | 'error';
  progress: number;
  errorMessage: string;
  preparingLabel: string;
  copyLabel: string;
  favorited: boolean;
  textKindLabel: string;
  displayLanguage: DisplayLanguage;
}>();

const copy = computed(() => getUiCopy(props.displayLanguage));

const emit = defineEmits<{
  copy: [];
  speak: [];
  retry: [];
  cancel: [];
  favorite: [];
}>();
</script>

<template>
  <div class="result-panel" aria-labelledby="result-title">
    <div class="field-heading">
      <h2 id="result-title">{{ copy.translation }}</h2>
      <button
        v-if="status === 'translating' || status === 'preparing-model'"
        class="text-button subtle-button"
        type="button"
        @click="emit('cancel')"
      >
        {{ copy.cancel }}
      </button>
    </div>

    <div v-if="sourceText" class="result-meta">
      <span>{{ sourceText }}</span>
      <span v-if="textKindLabel" class="type-badge">{{ textKindLabel }}</span>
    </div>
    <div class="result-content">
      <div
        v-if="translatedText"
        class="translated-text"
        aria-live="polite"
        aria-atomic="true"
      >
        {{ translatedText }}
      </div>
      <div v-else-if="status === 'idle'" class="result-placeholder">
        {{ copy.resultPlaceholder }}
      </div>

      <TranslationStatus
        :status="status"
        :progress="progress"
        :error-message="errorMessage"
        :preparing-label="preparingLabel"
        :display-language="displayLanguage"
      />
    </div>

    <div v-if="status === 'error'" class="result-actions">
      <button class="secondary-button" type="button" @click="emit('retry')">{{ copy.retry }}</button>
    </div>
    <div v-else-if="translatedText" class="result-actions">
      <button
        class="action-button"
        type="button"
        :aria-label="copy.speak"
        :title="copy.speak"
        @click="emit('speak')"
      >
        <span aria-hidden="true" class="action-icon">🔊</span>
        <span class="sr-only">{{ copy.speak }}</span>
      </button>
      <button
        class="action-button"
        type="button"
        :aria-label="favorited ? copy.unfavorite : copy.favorite"
        :title="favorited ? copy.unfavorite : copy.favorite"
        :aria-pressed="favorited"
        @click="emit('favorite')"
      >
        <span aria-hidden="true" class="action-icon">{{ favorited ? '★' : '☆' }}</span>
        <span class="sr-only">{{ favorited ? copy.unfavorite : copy.favorite }}</span>
      </button>
      <button
        class="action-button"
        type="button"
        :aria-label="copyLabel"
        :title="copyLabel"
        @click="emit('copy')"
      >
        <span aria-hidden="true" class="action-icon">{{ copyLabel === copy.copied ? '✓' : '⧉' }}</span>
        <span class="sr-only">{{ copyLabel }}</span>
      </button>
    </div>
  </div>
</template>
