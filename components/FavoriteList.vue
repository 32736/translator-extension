<script setup lang="ts">
import { computed } from 'vue';
import type { FavoriteEntity } from '../core/storage/favorite-repository';
import {
  getUiCopy,
  type DisplayLanguage,
} from '../core/i18n/ui';

const props = defineProps<{
  items: FavoriteEntity[];
  displayLanguage: DisplayLanguage;
}>();

const copy = computed(() => getUiCopy(props.displayLanguage));

const emit = defineEmits<{
  select: [item: FavoriteEntity];
  delete: [item: FavoriteEntity];
}>();
</script>

<template>
  <div v-if="items.length === 0" class="saved-empty">{{ copy.noFavorites }}</div>
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
          :aria-label="copy.deleteFavorite(item.sourceText)"
          :title="copy.deleteFavorite(item.sourceText)"
          @click="emit('delete', item)"
        >
          <span aria-hidden="true">×</span>
        </button>
      </div>
    </li>
  </ul>
</template>
