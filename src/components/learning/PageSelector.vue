<script setup>
import { useVocabularyStore } from '@/stores/useVocabularyStore'

const props = defineProps({ modelValue: Number })
const emit = defineEmits(['update:modelValue'])

const vocabStore = useVocabularyStore()
</script>

<template>
  <div class="page-selector">
    <h2 class="selector-title">選擇頁碼</h2>

    <!-- 桌機：格狀按鈕 -->
    <div class="page-grid">
      <button
        v-for="page in vocabStore.pageNumbers"
        :key="page"
        class="page-btn"
        :class="{ active: page === modelValue }"
        @click="emit('update:modelValue', page)"
      >
        <span class="page-num">P{{ page }}</span>
        <span class="page-level">Lv{{ vocabStore.getPageLevel(page) }}</span>
      </button>
    </div>

    <!-- 手機：下拉選單 -->
    <select
      class="page-select-mobile"
      :value="modelValue"
      @change="emit('update:modelValue', +$event.target.value)"
    >
      <option
        v-for="page in vocabStore.pageNumbers"
        :key="page"
        :value="page"
      >
        P{{ page }} — Level {{ vocabStore.getPageLevel(page) }}
      </option>
    </select>
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

/* ── 桌機格狀按鈕 ── */
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
  border: 1px solid var(--color-border-light);
  border-radius: 6px;
  background: var(--color-surface);
  color: var(--color-text);
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
.page-num { font-weight: 600; }
.page-level { font-size: 0.7rem; opacity: 0.8; }

/* ── 手機下拉選單 ── */
.page-select-mobile {
  display: none;
  width: 100%;
  padding: 0.6rem 0.75rem;
  border: 1px solid var(--color-border-light);
  border-radius: 8px;
  font-size: 1rem;
  background: var(--color-surface);
  color: var(--color-text);
  cursor: pointer;
}

@media (max-width: 640px) {
  .page-grid { display: none; }
  .page-select-mobile { display: block; }
}
</style>
