<script setup lang="ts">
import { computed } from 'vue';
import type { HistoryEntity } from '../core/storage/history-repository';
import {
  getUiCopy,
  type DisplayLanguage,
} from '../core/i18n/ui';

const props = defineProps<{
  items: HistoryEntity[];
  displayLanguage: DisplayLanguage;
}>();

const copy = computed(() => getUiCopy(props.displayLanguage));

const emit = defineEmits<{
  select: [item: HistoryEntity];
  delete: [item: HistoryEntity];
}>();
</script>

<template>
  <div v-if="items.length === 0" class="saved-empty">{{ copy.noHistory }}</div>
  <ul v-else class="saved-list">
    <li v-for="item in items" :key="item.id">
      <div class="saved-item-row">
        <button
          class="saved-item"
          type="button"
          @click="emit('select', item)"
        >
          <span class="saved-source">{{ item.sourceText }}</span>
          <span class="saved-translation">{{ item.translatedText }}</span>
          <span class="saved-arrow" aria-hidden="true">›</span>
        </button>
        <button
          class="saved-delete"
          type="button"
          :aria-label="copy.deleteHistory(item.sourceText)"
          :title="copy.deleteHistory(item.sourceText)"
          @click="emit('delete', item)"
        >
          <span aria-hidden="true">×</span>
        </button>
      </div>
    </li>
  </ul>
</template>
