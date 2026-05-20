<script setup>
import { useVocabularyStore } from '@/stores/useVocabularyStore'

defineProps({ modelValue: Number })
defineEmits(['update:modelValue'])

const vocabStore = useVocabularyStore()
</script>

<template>
  <div class="page-selector">
    <h2 class="selector-title">選擇頁碼</h2>
    <div class="page-grid">
      <button
        v-for="page in vocabStore.pageNumbers"
        :key="page"
        class="page-btn"
        :class="{ active: page === modelValue }"
        @click="$emit('update:modelValue', page)"
      >
        <span class="page-num">P{{ page }}</span>
        <span class="page-level">Lv{{ vocabStore.getPageLevel(page) }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.page-selector {
  padding: 1rem 2rem;
}
.selector-title {
  font-size: 1rem;
  color: var(--color-muted);
  margin-bottom: 0.75rem;
}
.page-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.page-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.4rem 0.75rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  background: var(--color-surface);
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.15s;
}
.page-btn:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}
.page-btn.active {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: #fff;
}
.page-num {
  font-weight: 600;
}
.page-level {
  font-size: 0.7rem;
  opacity: 0.8;
}
</style>
