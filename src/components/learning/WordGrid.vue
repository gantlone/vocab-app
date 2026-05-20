<script setup>
import { computed } from 'vue'
import { useVocabularyStore } from '@/stores/useVocabularyStore'
import WordCard from './WordCard.vue'

const props = defineProps({ page: Number })
defineEmits(['word-click'])

const vocabStore = useVocabularyStore()
const words = computed(() => vocabStore.getPageWords(props.page))
</script>

<template>
  <div class="word-grid-wrap">
    <div class="grid-header">
      第 {{ page }} 頁 — Level {{ vocabStore.getPageLevel(page) }}
      <span class="word-count">{{ words.length }} 個單字</span>
    </div>
    <div class="word-grid">
      <WordCard
        v-for="word in words"
        :key="word.id"
        :word="word"
        @click="$emit('word-click', word)"
      />
    </div>
  </div>
</template>

<style scoped>
.word-grid-wrap {
  padding: 0 2rem 2rem;
}
.grid-header {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.word-count {
  font-size: 0.82rem;
  color: var(--color-muted);
  font-weight: 400;
}
.word-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 0.6rem;
}
</style>
