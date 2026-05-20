<script setup>
import { ref, computed, onMounted } from 'vue'
import { useVocabularyStore } from '@/stores/useVocabularyStore'
import { useMemoryStore } from '@/stores/useMemoryStore'
import { buildPracticeQueue } from '@/utils/srs'
import { logError } from '@/utils/logError'

const props = defineProps({ page: Number })
defineEmits(['back'])

const vocabStore = useVocabularyStore()
const memoryStore = useMemoryStore()

const queue = ref([])
const index = ref(0)
const flipped = ref(false)
const done = ref(false)
const mountError = ref(null)

onMounted(async () => {
  try {
    const pageWords = vocabStore.getPageWords(props.page)
    if (!pageWords?.length) throw new Error(`getPageWords(${props.page}) returned empty`)

    const dueWords = memoryStore.getDueWords()
      .map(r => vocabStore.getWordById(r.id))
      .filter(Boolean)

    queue.value = buildPracticeQueue(pageWords, dueWords, 10)
  } catch (e) {
    mountError.value = e.message
    await logError('FlashCard.onMounted failed: ' + e.message, e.stack)
  }
})

const current = computed(() => queue.value[index.value] ?? null)

async function mark(level) {
  try {
    memoryStore.markFamiliarity(current.value.id, current.value.word, level)
    if (index.value < queue.value.length - 1) {
      index.value++
      flipped.value = false
    } else {
      done.value = true
    }
  } catch (e) {
    await logError('FlashCard.mark failed: ' + e.message, e.stack)
  }
}
</script>

<template>
  <div class="flashcard-view">
    <button class="back-btn" @click="$emit('back')">← 返回選擇</button>

    <div v-if="mountError" class="mount-error">載入失敗：{{ mountError }}</div>

    <div v-else-if="done" class="done-msg">
      <p>本輪練習完成！</p>
      <button class="done-btn" @click="$emit('back')">回到選擇</button>
    </div>

    <template v-else-if="current">
      <div class="progress">{{ index + 1 }} / {{ queue.length }}</div>

      <div class="card" @click="flipped = true">
        <div class="card-front">
          <span class="card-word">{{ current.word }}</span>
          <span v-if="!flipped" class="card-hint">點擊翻面</span>
        </div>
        <Transition name="fade">
          <div v-if="flipped" class="card-back">
            <span class="card-pos">{{ current.pos }}</span>
            <span class="card-meaning">{{ current.meaning }}</span>
            <span class="card-phonetic">{{ current.phonetic }}</span>
          </div>
        </Transition>
      </div>

      <div v-if="flipped" class="mark-btns">
        <button class="btn-hard" @click="mark(0)">不熟</button>
        <button class="btn-ok" @click="mark(2)">普通</button>
        <button class="btn-easy" @click="mark(4)">熟悉</button>
      </div>
    </template>

    <div v-else class="loading">載入單字中…</div>
  </div>
</template>

<style scoped>
.flashcard-view {
  padding: 1.5rem 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.back-btn {
  align-self: flex-start;
  background: none;
  border: none;
  color: var(--color-primary);
  cursor: pointer;
  font-size: 0.95rem;
  margin-bottom: 1.5rem;
}
.progress {
  color: var(--color-muted);
  font-size: 0.9rem;
  margin-bottom: 1.25rem;
}
.loading {
  color: var(--color-muted);
  margin-top: 2rem;
}
.mount-error {
  color: #c92a2a;
  margin-top: 2rem;
}
.card {
  width: min(400px, 90vw);
  min-height: 200px;
  background: var(--color-surface);
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.1);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  gap: 0.75rem;
  text-align: center;
  transition: box-shadow 0.2s;
}
.card:hover { box-shadow: 0 6px 24px rgba(74,158,255,0.2); }
.card-front, .card-back {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}
.card-word {
  font-size: clamp(1.6rem, 6vw, 2.2rem);
  font-weight: 700;
}
.card-hint { font-size: 0.82rem; color: var(--color-muted); }
.card-pos { font-style: italic; color: var(--color-muted); font-size: 0.85rem; }
.card-meaning { font-size: 1.5rem; font-weight: 600; }
.card-phonetic { font-size: 0.85rem; color: var(--color-muted); font-family: monospace; }
.mark-btns {
  display: flex;
  gap: 1rem;
  margin-top: 1.5rem;
}
.mark-btns button {
  padding: 0.6rem 1.5rem;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 500;
  transition: opacity 0.15s;
}
.mark-btns button:hover { opacity: 0.85; }
.btn-hard { background: #ff6b6b; color: #fff; }
.btn-ok   { background: #ffa94d; color: #fff; }
.btn-easy { background: #51cf66; color: #fff; }
.done-msg {
  text-align: center;
  margin-top: 3rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  font-size: 1.1rem;
}
.done-btn {
  padding: 0.6rem 1.5rem;
  background: var(--color-primary);
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.95rem;
}
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
