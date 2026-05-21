<script setup>
import { ref, computed, onMounted } from 'vue'
import { useVocabularyStore } from '@/stores/useVocabularyStore'
import { useMemoryStore } from '@/stores/useMemoryStore'
import { buildPracticeQueue, shuffle } from '@/utils/srs'
import { useSpeech } from '@/composables/useSpeech'
import { logError } from '@/utils/logError'

const props = defineProps({ page: Number })
defineEmits(['back'])

const vocabStore = useVocabularyStore()
const memoryStore = useMemoryStore()
const { speakText } = useSpeech()

const queue = ref([])
const index = ref(0)
const selected = ref(null)
const score = ref(0)
const done = ref(false)
const mountError = ref(null)

onMounted(async () => {
  try {
    const allPageWords = vocabStore.getPageWords(props.page)
    if (!allPageWords?.length) throw new Error(`getPageWords(${props.page}) returned empty`)

    const pageWords = allPageWords.filter(w => !memoryStore.getRecord(w.id)?.isFamiliar)

    const dueWords = memoryStore.getDueWords()
      .map(r => vocabStore.getWordById(r.id))
      .filter(Boolean)

    queue.value = buildPracticeQueue(pageWords, dueWords, 10)
  } catch (e) {
    mountError.value = e.message
    await logError('QuizCard.onMounted failed: ' + e.message, e.stack)
  }
})

const current = computed(() => queue.value[index.value] ?? null)

const options = computed(() => {
  try {
    if (!current.value) return []
    const level = vocabStore.getPageLevel(props.page)
    const distractors = vocabStore.getRandomWordsFromLevel(level, 3, [current.value.id])
    return shuffle([current.value, ...distractors])
  } catch (e) {
    logError('QuizCard.options computed failed: ' + e.message, e.stack)
    return []
  }
})

async function answer(opt) {
  try {
    if (selected.value) return
    selected.value = opt
    const isCorrect = opt.id === current.value.id
    memoryStore.recordAnswer(current.value.id, current.value.word, isCorrect)
    if (isCorrect) score.value++
    speakText(current.value.word, 'us')
  } catch (e) {
    await logError('QuizCard.answer failed: ' + e.message, e.stack)
  }
}

function next() {
  if (index.value < queue.value.length - 1) {
    index.value++
    selected.value = null
  } else {
    done.value = true
  }
}

function optClass(opt) {
  if (!selected.value) return ''
  if (opt.id === current.value.id) return 'correct'
  if (opt.id === selected.value.id) return 'wrong'
  return ''
}
</script>

<template>
  <div class="quiz-view">
    <button class="back-btn" @click="$emit('back')">← 返回選擇</button>

    <div v-if="mountError" class="mount-error">載入失敗：{{ mountError }}</div>

    <div v-else-if="done" class="done-msg">
      <p>測驗結束！得分：{{ score }} / {{ queue.length }}</p>
      <button class="done-btn" @click="$emit('back')">回到選擇</button>
    </div>

    <template v-else-if="current">
      <div class="progress">{{ index + 1 }} / {{ queue.length }} ｜ 得分 {{ score }}</div>

      <div class="quiz-word-row">
        <span class="quiz-word">{{ current.word }}</span>
        <template v-if="selected">
          <button class="speak-btn" title="美式發音" @click="speakText(current.word, 'us')">🇺🇸</button>
          <button class="speak-btn" title="英式發音" @click="speakText(current.word, 'uk')">🇬🇧</button>
        </template>
      </div>
      <p class="quiz-prompt">選出正確的中文意思</p>

      <div class="quiz-options">
        <button
          v-for="opt in options"
          :key="opt.id"
          :class="['opt-btn', optClass(opt)]"
          @click="answer(opt)"
        >
          {{ opt.meaning }}
        </button>
      </div>

      <button v-if="selected" class="next-btn" @click="next">下一題 →</button>
    </template>

    <div v-else class="loading">載入單字中…</div>
  </div>
</template>

<style scoped>
.quiz-view {
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
.progress { color: var(--color-muted); font-size: 0.9rem; margin-bottom: 1.25rem; }
.quiz-word-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-bottom: 0.5rem;
}
.quiz-word { font-size: clamp(1.8rem, 6vw, 2.4rem); font-weight: 700; }
.speak-btn {
  padding: 0.3rem 0.7rem;
  border: 1px solid var(--color-border-light);
  border-radius: 6px;
  background: none;
  cursor: pointer;
  font-size: 1rem;
  color: inherit;
  transition: border-color 0.15s;
  flex-shrink: 0;
}
.speak-btn:hover { border-color: var(--color-primary); }
.quiz-prompt { color: var(--color-muted); font-size: 0.9rem; margin-bottom: 1.5rem; }
.loading, .mount-error { color: var(--color-muted); margin-top: 2rem; }
.mount-error { color: #c92a2a; }
.quiz-options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  width: min(480px, 90vw);
}
.opt-btn {
  padding: 0.85rem 1rem;
  border: 2px solid var(--color-border-light);
  border-radius: 10px;
  background: var(--color-surface);
  color: var(--color-text);
  cursor: pointer;
  font-size: 0.95rem;
  transition: all 0.15s;
  text-align: center;
}
.opt-btn:hover:not(.correct):not(.wrong) {
  border-color: var(--color-primary);
  color: var(--color-primary);
}
.opt-btn.correct {
  background: var(--color-correct-bg);
  border-color: var(--color-correct-border);
  color: var(--color-correct-text);
}
.opt-btn.wrong {
  background: var(--color-wrong-bg);
  border-color: var(--color-wrong-border);
  color: var(--color-wrong-text);
}
.next-btn {
  margin-top: 1.5rem;
  padding: 0.65rem 2rem;
  background: var(--color-primary);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
  transition: opacity 0.15s;
}
.next-btn:hover { opacity: 0.88; }
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
</style>
