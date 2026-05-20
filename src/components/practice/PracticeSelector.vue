<script setup>
import { ref } from 'vue'
import { useVocabularyStore } from '@/stores/useVocabularyStore'

defineEmits(['start'])

const vocabStore = useVocabularyStore()
const selectedPage = ref(vocabStore.pageNumbers[0])
const selectedMode = ref('flashcard')
</script>

<template>
  <div class="practice-selector">
    <h2 class="selector-heading">選擇練習設定</h2>

    <div class="selector-row">
      <label>頁碼</label>
      <select v-model="selectedPage" class="page-select">
        <option v-for="p in vocabStore.pageNumbers" :key="p" :value="p">
          P{{ p }} (Level {{ vocabStore.getPageLevel(p) }})
        </option>
      </select>
    </div>

    <div class="selector-row">
      <label>練習模式</label>
      <div class="mode-btns">
        <button
          :class="{ active: selectedMode === 'flashcard' }"
          @click="selectedMode = 'flashcard'"
        >
          單字卡
        </button>
        <button
          :class="{ active: selectedMode === 'quiz' }"
          @click="selectedMode = 'quiz'"
        >
          測驗
        </button>
      </div>
    </div>

    <button class="start-btn" @click="$emit('start', { page: selectedPage, mode: selectedMode })">
      開始練習
    </button>
  </div>
</template>

<style scoped>
.practice-selector {
  max-width: 480px;
  margin: 3rem auto;
  background: var(--color-surface);
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 2px 12px rgba(0,0,0,0.08);
}
.selector-heading {
  font-size: 1.3rem;
  margin-bottom: 1.5rem;
}
.selector-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.25rem;
}
.selector-row label {
  width: 80px;
  font-weight: 500;
  color: var(--color-muted);
  flex-shrink: 0;
}
.page-select {
  flex: 1;
  padding: 0.4rem 0.75rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 0.95rem;
  background: var(--color-bg);
}
.mode-btns {
  display: flex;
  gap: 0.5rem;
}
.mode-btns button {
  padding: 0.4rem 1rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  background: none;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.15s;
}
.mode-btns button.active {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: #fff;
}
.start-btn {
  width: 100%;
  padding: 0.75rem;
  background: var(--color-primary);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  margin-top: 0.5rem;
  transition: opacity 0.15s;
}
.start-btn:hover {
  opacity: 0.88;
}
</style>
