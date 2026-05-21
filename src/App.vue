<script setup>
import { ref, watch, onErrorCaptured } from 'vue'
import { useMemoryStore } from '@/stores/useMemoryStore'
import { logError } from '@/utils/logError'
import LearningTab from '@/components/learning/LearningTab.vue'
import PracticeTab from '@/components/practice/PracticeTab.vue'

const activeTab = ref('learning')
const memoryStore = useMemoryStore()
const importInput = ref(null)

const theme = ref(localStorage.getItem('vocab-theme') || 'light')

watch(theme, (t) => {
  document.documentElement.setAttribute('data-theme', t)
  localStorage.setItem('vocab-theme', t)
})

function toggleTheme() {
  theme.value = theme.value === 'light' ? 'dark' : 'light'
}

async function resetMemory() {
  if (!confirm('確定要清空所有學習進度？')) return
  await memoryStore.resetAll()
  location.reload()
}

function exportMemory() {
  const json = memoryStore.exportRecords()
  const date = new Date().toISOString().slice(0, 10)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `memory-backup-${date}.json`
  a.click()
  URL.revokeObjectURL(url)
}

async function handleImport(e) {
  const file = e.target.files[0]
  if (!file) return
  try {
    const text = await file.text()
    const data = JSON.parse(text)
    if (
      data === null || typeof data !== 'object' || Array.isArray(data) ||
      !Object.keys(data).every(k => /^p\d+_w\d+$/.test(k))
    ) {
      alert('格式錯誤：不是有效的進度備份檔')
      return
    }
    await memoryStore.importRecords(data)
    location.reload()
  } catch {
    alert('檔案解析失敗，請確認是正確的 JSON 格式')
  }
  e.target.value = ''
}

onErrorCaptured((err, _instance, info) => {
  logError(`[App root] uncaught in ${info}: ${err.message}`, err.stack)
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
      <div class="header-actions">
        <button class="theme-btn" :title="theme === 'dark' ? '切換淺色模式' : '切換深色模式'" @click="toggleTheme">
          {{ theme === 'dark' ? '☀️' : '🌙' }}
        </button>
        <button class="action-btn" title="匯出學習進度備份" @click="exportMemory">匯出</button>
        <button class="action-btn" title="從備份檔載入學習進度" @click="importInput.click()">匯入</button>
        <input ref="importInput" type="file" accept=".json" style="display:none" @change="handleImport">
        <button class="reset-btn" @click="resetMemory">重置</button>
      </div>
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
  border-bottom: 1px solid var(--color-border);
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
.header-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}
.theme-btn {
  padding: 0.3rem 0.5rem;
  border: 1px solid var(--color-border-light);
  border-radius: 6px;
  background: none;
  color: var(--color-text);
  cursor: pointer;
  font-size: 1rem;
  line-height: 1;
  transition: border-color 0.15s;
}
.theme-btn:hover {
  border-color: var(--color-primary);
}
.action-btn {
  padding: 0.35rem 0.85rem;
  border: 1px solid var(--color-border-light);
  border-radius: 6px;
  background: none;
  cursor: pointer;
  font-size: 0.82rem;
  color: var(--color-muted);
  transition: all 0.15s;
  white-space: nowrap;
}
.action-btn:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}
.reset-btn {
  padding: 0.35rem 0.85rem;
  border: 1px solid var(--color-border-light);
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
