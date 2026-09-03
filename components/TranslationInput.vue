<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import {
  getUiCopy,
  type DisplayLanguage,
} from '../core/i18n/ui';

const props = defineProps<{
  modelValue: string;
  disabled: boolean;
  canSpeakSource: boolean;
  displayLanguage: DisplayLanguage;
}>();

const copy = computed(() => getUiCopy(props.displayLanguage));

const emit = defineEmits<{
  'update:modelValue': [value: string];
  translate: [];
  clear: [];
  speak: [];
  paste: [];
}>();

const textareaRef = ref<HTMLTextAreaElement | null>(null);

onMounted(() => {
  textareaRef.value?.focus();
});

function handleKeydown(event: KeyboardEvent): void {
  if (
    event.key === 'Enter' &&
    !event.shiftKey &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.altKey
  ) {
    event.preventDefault();
    emit('translate');
  }
}

</script>

<template>
  <div class="input-panel" aria-labelledby="input-title">
    <div class="field-heading">
      <label id="input-title" for="translation-input">{{ copy.inputLabel }}</label>
      <button
        class="text-button subtle-button clear-input-button"
        :class="{ 'is-hidden': !modelValue }"
        type="button"
        :disabled="disabled || !modelValue"
        :aria-hidden="!modelValue ? 'true' : undefined"
        :title="copy.clearSource"
        @click="emit('clear')"
      >
        {{ copy.clear }}
      </button>
    </div>

    <textarea
      id="translation-input"
      ref="textareaRef"
      :value="modelValue"
      :disabled="disabled"
      rows="4"
      :aria-label="copy.inputLabel"
      autofocus
      :placeholder="copy.inputPlaceholder"
      spellcheck="false"
      @input="emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
      @keydown="handleKeydown"
      @paste="emit('paste')"
    />

    <div class="panel-footer input-footer">
      <button
        class="action-button"
        type="button"
        :disabled="disabled || !modelValue || !canSpeakSource"
        :aria-label="copy.speakSource"
        :title="copy.speakSource"
        @click="emit('speak')"
      >
        <span aria-hidden="true" class="action-icon">🔊</span>
        <span class="sr-only">{{ copy.speakSource }}</span>
      </button>
      <div class="input-actions">
        <button class="primary-button" type="button" :disabled="disabled" @click="emit('translate')">
          <span>{{ copy.translate }}</span>
        </button>
      </div>
    </div>
  </div>
</template>
