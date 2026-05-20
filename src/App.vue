<script setup>
import { ref, onErrorCaptured } from 'vue'
import { useMemoryStore } from '@/stores/useMemoryStore'
import { logError } from '@/utils/logError'
import LearningTab from '@/components/learning/LearningTab.vue'
import PracticeTab from '@/components/practice/PracticeTab.vue'

const activeTab = ref('learning')
const memoryStore = useMemoryStore()

async function resetMemory() {
  if (!confirm('確定要清空所有學習進度？')) return
  await memoryStore.resetAll()
  location.reload()
}

onErrorCaptured((err, _instance, info) => {
  logError(`[App root] uncaught in ${info}: ${err.message}`, err.stack)
  // 不攔截，讓 Vue 繼續顯示錯誤
  return true
})
</script>

<template>
  <div class="app">
    <header class="app-header">
      <h1 class="app-title">高中 7000 單字</h1>
      <nav class="tab-nav">
        <button :class="{ active: activeTab === 'learning' }" @click="activeTab = 'learning'">
          單字學習
        </button>
        <button :class="{ active: activeTab === 'practice' }" @click="activeTab = 'practice'">
          單字練習
        </button>
      </nav>
      <button class="reset-btn" @click="resetMemory">重置進度</button>
    </header>
    <main>
      <LearningTab v-show="activeTab === 'learning'" />
      <PracticeTab v-show="activeTab === 'practice'" />
    </main>
  </div>
</template>

<style scoped>
.app-header {
  padding: 0.75rem 2rem;
  border-bottom: 1px solid #e8e8e8;
  background: var(--color-surface);
  display: flex;
  align-items: center;
  gap: 2rem;
  position: sticky;
  top: 0;
  z-index: 100;
}
.app-title {
  font-size: 1.1rem;
  font-weight: 700;
  white-space: nowrap;
}
.tab-nav {
  display: flex;
  gap: 0.25rem;
  flex: 1;
}
.tab-nav button {
  padding: 0.4rem 1.1rem;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 0.95rem;
  border-bottom: 2px solid transparent;
  color: var(--color-muted);
  transition: all 0.15s;
}
.tab-nav button.active {
  border-bottom-color: var(--color-primary);
  color: var(--color-primary);
  font-weight: 600;
}
.reset-btn {
  padding: 0.35rem 0.85rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  background: none;
  cursor: pointer;
  font-size: 0.82rem;
  color: var(--color-muted);
  transition: all 0.15s;
  white-space: nowrap;
}
.reset-btn:hover {
  border-color: #ff6b6b;
  color: #ff6b6b;
}
</style>
