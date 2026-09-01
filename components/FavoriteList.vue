<script setup lang="ts">
import type { FavoriteEntity } from '../core/storage/favorite-repository';

defineProps<{
  items: FavoriteEntity[];
}>();

const emit = defineEmits<{
  select: [item: FavoriteEntity];
}>();
</script>

<template>
  <div v-if="items.length === 0" class="saved-empty">还没有收藏内容。</div>
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
