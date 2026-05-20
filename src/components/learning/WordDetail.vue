<script setup>
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { useSpeech } from '@/composables/useSpeech'
import { useDictionary } from '@/composables/useDictionary'
import { useVocabularyStore } from '@/stores/useVocabularyStore'

const props = defineProps({ word: Object })
defineEmits(['back'])

const { speak, speakText } = useSpeech()
const { fetchWord, loading, error } = useDictionary()
const vocabStore = useVocabularyStore()

const apiData = ref(null)

// 每個例句的展開狀態與翻譯結果，用 index 當 key
const open = reactive({})
const translations = reactive({})
const translationCache = {}

onMounted(async () => {
  apiData.value = await fetchWord(props.word.word)
  document.addEventListener('mousedown', onDocMousedown)
})

onUnmounted(() => {
  document.removeEventListener('mousedown', onDocMousedown)
})

async function toggleTranslation(i, sentence) {
  open[i] = !open[i]
  if (!open[i]) return
  if (translations[i] !== undefined) return

  if (translationCache[sentence]) {
    translations[i] = translationCache[sentence]
    return
  }

  translations[i] = null // null 代表載入中
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(sentence)}&langpair=en|zh-TW`
    const res = await fetch(url)
    const data = await res.json()
    const result = data?.responseData?.translatedText ?? '翻譯失敗'
    translationCache[sentence] = result
    translations[i] = result
  } catch {
    translations[i] = '翻譯失敗'
  }
}

// ── 反白 tooltip ──────────────────────────────────────
// word: 查到的詞條物件，x/y: fixed 座標
const tooltip = ref({ visible: false, word: null, x: 0, y: 0 })

function onExamplesMouseup(e) {
  try {
    const selected = window.getSelection()?.toString().trim()
    if (!selected || selected.length > 30) return

    const isEnglish = /^[a-zA-Z\s\-']+$/.test(selected)
    if (!isEnglish) return

    const found = vocabStore.findWordByText(selected)
    if (!found) return

    const x = Math.min(e.clientX + 12, window.innerWidth - 260)
    const y = Math.max(e.clientY - 50, 8)
    tooltip.value = { visible: true, word: found, x, y }
  } catch {
    // Chrome extension 等外部干擾（如 removeRange 錯誤）直接忽略
  }
}

function onDocMousedown() {
  tooltip.value.visible = false
}
</script>

<template>
  <div class="word-detail">
    <button class="back-btn" @click="$emit('back')">← 返回</button>

    <div class="detail-card">
      <h2 class="detail-word">{{ word.word }}</h2>
      <p class="detail-phonetic">{{ apiData?.phonetics?.text || word.phonetic }}</p>
      <p class="detail-pos-meaning">
        <em class="pos">{{ word.pos }}</em> {{ word.meaning }}
      </p>

      <div class="speak-btns">
        <button class="speak-btn" @click="speak(word.word, apiData?.phonetics?.us)">🔊 美式</button>
        <button class="speak-btn" @click="speak(word.word, apiData?.phonetics?.uk)">🔊 英式</button>
      </div>

      <div class="examples-section">
        <p v-if="loading" class="examples-loading">載入例句中…</p>
        <template v-else-if="apiData?.examples?.length">
          <h3 class="examples-title">例句</h3>
          <ul class="examples-list" @mouseup="onExamplesMouseup">
            <li v-for="(ex, i) in apiData.examples" :key="i" class="example-item">
              <div class="example-row">
                <button
                  class="arrow-btn"
                  :class="{ open: open[i] }"
                  @click="toggleTranslation(i, ex)"
                  title="顯示翻譯"
                >▶</button>
                <span class="example-text">{{ ex }}</span>
                <div class="ex-speak-btns">
                  <button class="ex-speak-btn" title="美式發音" @click="speakText(ex, 'us')">🇺🇸</button>
                  <button class="ex-speak-btn" title="英式發音" @click="speakText(ex, 'uk')">🇬🇧</button>
                </div>
              </div>
              <div class="translation-body" :class="{ open: open[i] }">
                <span v-if="translations[i] === null" class="translation-text muted">翻譯中…</span>
                <span v-else-if="translations[i]" class="translation-text">{{ translations[i] }}</span>
              </div>
            </li>
          </ul>
        </template>
        <p v-else class="no-examples">
          {{ error ? '無法載入例句，但可以聽發音。' : '無例句資料，但可以聽發音。' }}
        </p>
      </div>
    </div>
  </div>

  <!-- 反白 tooltip，Teleport 到 body 避免被 overflow 裁切 -->
  <Teleport to="body">
    <div
      v-if="tooltip.visible"
      class="selection-tooltip"
      :style="{ left: tooltip.x + 'px', top: tooltip.y + 'px' }"
      @mousedown.stop
    >
      <span class="tooltip-label">
        {{ tooltip.word.word }}&nbsp;&nbsp;{{ tooltip.word.pos }}&nbsp;&nbsp;{{ tooltip.word.meaning }}
      </span>
      <button class="tooltip-speak-btn" @click="speak(tooltip.word.word, 'us')">🇺🇸</button>
      <button class="tooltip-speak-btn" @click="speak(tooltip.word.word, 'uk')">🇬🇧</button>
    </div>
  </Teleport>
</template>

<style scoped>
.word-detail {
  padding: 1rem 2rem 2rem;
  max-width: 700px;
}
.back-btn {
  background: none;
  border: none;
  color: var(--color-primary);
  cursor: pointer;
  font-size: 0.95rem;
  padding: 0;
  margin-bottom: 1.5rem;
}
.back-btn:hover { text-decoration: underline; }

.detail-card {
  background: var(--color-surface);
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 2px 12px rgba(0,0,0,0.08);
}
.detail-word {
  font-size: clamp(1.8rem, 5vw, 2.5rem);
  font-weight: 700;
  margin-bottom: 0.25rem;
}
.detail-phonetic {
  color: var(--color-muted);
  font-size: 1rem;
  margin-bottom: 0.75rem;
  font-family: monospace;
}
.detail-pos-meaning { font-size: 1.1rem; margin-bottom: 1.25rem; }
.pos { color: var(--color-muted); margin-right: 0.5rem; }

.speak-btns { display: flex; gap: 0.75rem; margin-bottom: 1.5rem; }
.speak-btn {
  padding: 0.4rem 1rem;
  border: 1px solid var(--color-primary);
  border-radius: 20px;
  color: var(--color-primary);
  background: none;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.15s;
}
.speak-btn:hover { background: var(--color-primary); color: #fff; }

.examples-title {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--color-muted);
  margin-bottom: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.examples-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.example-item {
  background: var(--color-bg);
  border-radius: 6px;
  border-left: 3px solid var(--color-primary);
  overflow: hidden;
}
.example-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.5rem 0.5rem 0.75rem;
}
.arrow-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.65rem;
  color: var(--color-muted);
  padding: 0;
  flex-shrink: 0;
  transition: transform 0.2s ease;
  line-height: 1;
}
.arrow-btn.open { transform: rotate(90deg); }

.example-text {
  font-size: 0.95rem;
  line-height: 1.5;
  flex: 1;
}
.ex-speak-btns {
  display: flex;
  gap: 0.1rem;
  flex-shrink: 0;
}
.ex-speak-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.9rem;
  padding: 0.15rem 0.2rem;
  opacity: 0.55;
  transition: transform 0.15s, opacity 0.15s;
  line-height: 1;
}
.ex-speak-btn:hover { transform: scale(1.2); opacity: 1; }

/* 滑順展開的翻譯區塊 */
.translation-body {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.25s ease;
}
.translation-body.open { max-height: 100px; }
.translation-text {
  display: block;
  font-size: 0.85rem;
  color: #888;
  padding: 0 0.75rem 0.5rem 1.85rem;
  line-height: 1.5;
}
.translation-text.muted { color: #bbb; }

.examples-loading,
.no-examples {
  color: var(--color-muted);
  font-size: 0.9rem;
}
</style>

<!-- tooltip 用 Teleport，不受 scoped 限制 -->
<style>
.selection-tooltip {
  position: fixed;
  background: #2c3e50;
  color: #fff;
  font-size: 0.82rem;
  padding: 0.3rem 0.45rem 0.3rem 0.7rem;
  border-radius: 6px;
  white-space: nowrap;
  z-index: 9999;
  box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  display: flex;
  align-items: center;
  gap: 0.3rem;
  user-select: none;
}
.tooltip-label {
  color: #fff;
}
.tooltip-speak-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  padding: 0.1rem 0.15rem;
  line-height: 1;
  transition: transform 0.15s;
}
.tooltip-speak-btn:hover { transform: scale(1.2); }
</style>
