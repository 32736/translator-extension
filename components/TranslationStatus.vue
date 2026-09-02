<script setup lang="ts">
import { computed } from 'vue';
import ModelDownloadProgress from './ModelDownloadProgress.vue';
import {
  getUiCopy,
  type DisplayLanguage,
} from '../core/i18n/ui';

const props = defineProps<{
  status: 'idle' | 'preparing-model' | 'translating' | 'success' | 'error';
  progress: number;
  errorMessage: string;
  preparingLabel: string;
  displayLanguage: DisplayLanguage;
}>();

const copy = computed(() => getUiCopy(props.displayLanguage));
</script>

<template>
  <ModelDownloadProgress
    v-if="status === 'preparing-model'"
    :progress="progress"
    :label="preparingLabel"
  />
  <p v-else-if="status === 'translating'" class="status-copy" role="status">
    {{ copy.translating }}
  </p>
  <p v-else-if="status === 'error'" class="error-copy" role="alert">
    {{ errorMessage }}
  </p>
</template>
