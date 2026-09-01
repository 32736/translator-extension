<script setup lang="ts">
import TranslationStatus from './TranslationStatus.vue';

defineProps<{
  sourceText: string;
  translatedText: string;
  status: 'idle' | 'preparing-model' | 'translating' | 'success' | 'error';
  progress: number;
  errorMessage: string;
  copyLabel: string;
  favorited: boolean;
  textKindLabel: string;
}>();

const emit = defineEmits<{
  copy: [];
  speak: [];
  retry: [];
  cancel: [];
  favorite: [];
}>();
</script>

<template>
  <section class="result-card" aria-labelledby="result-title">
    <div class="section-label-row">
      <h2 id="result-title">翻译结果</h2>
      <button
        v-if="status === 'translating' || status === 'preparing-model'"
        class="text-button"
        type="button"
        @click="emit('cancel')"
      >
        取消
      </button>
    </div>

    <div v-if="sourceText" class="source-preview">
      <span>{{ sourceText }}</span>
      <span v-if="textKindLabel" class="type-badge">{{ textKindLabel }}</span>
    </div>
    <div v-if="translatedText" class="translated-text">{{ translatedText }}</div>
    <div v-else-if="status === 'idle'" class="result-placeholder">
      翻译内容会显示在这里。
    </div>

    <TranslationStatus
      :status="status"
      :progress="progress"
      :error-message="errorMessage"
    />

    <div v-if="status === 'error'" class="result-actions">
      <button class="secondary-button" type="button" @click="emit('retry')">重试</button>
    </div>
    <div v-else-if="translatedText" class="result-actions">
      <button class="secondary-button" type="button" @click="emit('speak')">🔊 发音</button>
      <button class="secondary-button" type="button" @click="emit('copy')">{{ copyLabel }}</button>
      <button class="secondary-button" type="button" @click="emit('favorite')">
        {{ favorited ? '已收藏' : '收藏' }}
      </button>
    </div>
  </section>
</template>
