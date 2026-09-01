<script setup lang="ts">
import type { HistoryEntity } from '../core/storage/history-repository';

defineProps<{
  items: HistoryEntity[];
}>();

const emit = defineEmits<{
  select: [item: HistoryEntity];
}>();
</script>

<template>
  <div v-if="items.length === 0" class="saved-empty">还没有翻译历史。</div>
  <div v-else class="saved-list">
    <button
      v-for="item in items"
      :key="item.id"
      class="saved-item"
      type="button"
      @click="emit('select', item)"
    >
      <span class="saved-source">{{ item.sourceText }}</span>
      <span class="saved-translation">{{ item.translatedText }}</span>
    </button>
  </div>
</template>
