<script setup>
import { ref, computed, onErrorCaptured } from 'vue'
import { logError } from '@/utils/logError'
import PracticeSelector from './PracticeSelector.vue'
import FlashCard from './FlashCard.vue'
import QuizCard from './QuizCard.vue'

const session = ref(null)
const childError = ref(null)

// 獨立計算，避免 session 為 null 時模板直接存取 .mode 出錯
const sessionMode = computed(() => session.value?.mode ?? null)

function onStart({ page, mode }) {
  try {
    childError.value = null
    session.value = { page, mode }
  } catch (e) {
    logError('PracticeTab.onStart failed: ' + e.message, e.stack)
  }
}

function onBack() {
  session.value = null
  childError.value = null
}

onErrorCaptured((err, instance, info) => {
  const msg = `PracticeTab child error (${info}): ${err.message}`
  logError(msg, err.stack)
  childError.value = err.message
  return false // 不向上傳遞，由此元件自行處理
})
</script>

<template>
  <div class="practice-tab">
    <div v-if="childError" class="child-error">
      <p>發生錯誤：{{ childError }}</p>
      <button @click="onBack">返回選擇</button>
    </div>
    <template v-else>
      <PracticeSelector v-if="!session" @start="onStart" />
      <FlashCard
        v-else-if="sessionMode === 'flashcard'"
        :page="session.page"
        @back="onBack"
      />
      <QuizCard
        v-else-if="sessionMode === 'quiz'"
        :page="session.page"
        @back="onBack"
      />
    </template>
  </div>
</template>

<style scoped>
.child-error {
  padding: 2rem;
  text-align: center;
  color: #c92a2a;
}
.child-error button {
  margin-top: 1rem;
  padding: 0.5rem 1.5rem;
  background: var(--color-primary);
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}
</style>
