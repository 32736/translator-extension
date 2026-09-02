<script setup lang="ts">
import type { SourceLanguage } from '../core/translator/types';
import { languageInputLabel } from '../core/translator/languages';

defineProps<{
  modelValue: string;
  disabled: boolean;
  sourceLanguage: SourceLanguage | 'auto';
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
  translate: [];
  clear: [];
  paste: [];
}>();

function handleKeydown(event: KeyboardEvent): void {
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    event.preventDefault();
    emit('translate');
  }
}

function inputLabel(sourceLanguage: SourceLanguage | 'auto'): string {
  if (sourceLanguage === 'auto') {
    return '输入内容';
  }

  return languageInputLabel(sourceLanguage);
}
</script>

<template>
  <section class="input-card" aria-labelledby="input-title">
    <div class="section-label-row">
      <label id="input-title" for="translation-input">{{ inputLabel(sourceLanguage) }}</label>
      <button
        v-if="modelValue"
        class="text-button"
        type="button"
        :disabled="disabled"
        @click="emit('clear')"
      >
        清空
      </button>
    </div>

    <textarea
      id="translation-input"
      :value="modelValue"
      :disabled="disabled"
      rows="6"
      placeholder="输入单词、短语或短句…"
      spellcheck="false"
      @input="emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
      @keydown="handleKeydown"
      @paste="emit('paste')"
    />

    <div class="input-footer">
      <span class="hint">Ctrl / ⌘ + Enter 翻译</span>
      <button class="primary-button" type="button" :disabled="disabled" @click="emit('translate')">
        翻译
      </button>
    </div>
  </section>
</template>
