<script setup lang="ts">
defineProps<{
  progress: number;
  label: string;
}>();
</script>

<template>
  <div class="download-progress" role="status" aria-live="polite">
    <div class="status-line">
      <span>{{ label }}</span>
      <span>{{ Math.round(progress * 100) }}%</span>
    </div>
    <div class="progress-track" aria-hidden="true">
      <div class="progress-value" :style="{ width: `${progress * 100}%` }" />
    </div>
  </div>
</template>
