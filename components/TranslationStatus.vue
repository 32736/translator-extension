<script setup lang="ts">
import ModelDownloadProgress from './ModelDownloadProgress.vue';

defineProps<{
  status: 'idle' | 'preparing-model' | 'translating' | 'success' | 'error';
  progress: number;
  errorMessage: string;
}>();
</script>

<template>
  <ModelDownloadProgress v-if="status === 'preparing-model'" :progress="progress" />
  <p v-else-if="status === 'translating'" class="status-copy" role="status">
    正在翻译…
  </p>
  <p v-else-if="status === 'error'" class="error-copy" role="alert">
    {{ errorMessage }}
  </p>
</template>
