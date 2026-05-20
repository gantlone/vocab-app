---
name: vocab-app-development
description: 開發高中 7000 單字背誦網頁時使用此 skill。涵蓋 PDF 解析腳本、Vite plugin 製作(自動儲存 memory.json 到本地檔案)、Vue 3 元件模式、艾賓浩斯 SRS 演算法、Dictionary API 整合、Web Speech API 用法、localStorage + 檔案雙寫策略、Pinia store 標準寫法。當 Claude Code 需要新增/修改任何元件、composable、store,或設計新功能時,都應該先讀這份檔案。
---

# 單字 App 開發 Skill

## 何時使用此 Skill

- 新增任何 Vue 元件、composable、store
- 寫或改 Vite plugin
- 處理 PDF 解析、發音、例句查詢
- 實作或調整艾賓浩斯演算法
- 不確定某個東西該放哪個資料夾時

## 1. 專案初始化(從零開始的完整步驟)

```bash
# 1. 建立 Vite + Vue 專案
npm create vite@latest vocab-app -- --template vue
cd vocab-app

# 2. 安裝相依套件
npm install
npm install pinia
npm install --save-dev pdfjs-dist

# 3. 建立資料夾
mkdir -p docs scripts src/data src/stores src/composables src/utils
mkdir -p src/components/learning src/components/practice
mkdir -p vite-plugins

# 4. 把 PDF 放進 docs/
# (從你的本地放 docs/高中7000單.pdf)

# 5. 初始化空的 memory.json
echo "{}" > src/data/memory.json
```

修改 `package.json` 加入 parse-pdf 指令:
```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "parse-pdf": "node scripts/parse-pdf.js"
  }
}
```

## 2. PDF 解析腳本 (`scripts/parse-pdf.js`)

PDF 中每個 Level 開頭有 `大考中心字彙表 LEVEL X (N words)`,接下來每行通常是:

```
word [phonetic] pos. 中文意思
```

特殊格式要處理:

| 範例 | 處理方式 |
|---|---|
| `a/an [ən] art. 一` | 主詞用整個 `a/an` 字串 |
| `account1[əˋkaʊnt] n.帳目` | 移除字尾數字(同字多義) |
| `bear (2) [bɛr] vt. 搬運` | (2) 視為次要釋義 |
| `MRT/mass rapid transit n.大眾捷運系統` | 縮寫優先,完整名稱放 `aliases` |

**用 pdfjs-dist 逐頁解析(較穩定):**

```js
// scripts/parse-pdf.js
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PDF_PATH = path.resolve(__dirname, '../docs/高中7000單.pdf')
const OUTPUT_PATH = path.resolve(__dirname, '../src/data/vocabulary.json')

const POS_PATTERN = /\b(n|v|vt|vi|adj|adv|prep|conj|pron|art|aux|int|phr)\b\./i
const PHONETIC_PATTERN = /\[([^\]]+)\]/

async function parsePdf() {
  const data = new Uint8Array(await fs.readFile(PDF_PATH))
  const doc = await pdfjsLib.getDocument({ data }).promise
  
  const result = {
    metadata: { totalPages: doc.numPages, totalWords: 0, levels: {} },
    pages: {}
  }
  
  let currentLevel = null
  
  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum)
    const content = await page.getTextContent()
    const text = content.items.map(it => it.str).join(' ')
    
    // 偵測 Level 標題
    const levelMatch = text.match(/LEVEL\s+(\d+)/i)
    if (levelMatch) {
      currentLevel = parseInt(levelMatch[1])
      if (!result.metadata.levels[currentLevel]) {
        result.metadata.levels[currentLevel] = { pages: [pageNum], wordCount: 0 }
      }
    }
    
    const words = parsePageText(text, pageNum)
    
    result.pages[pageNum] = {
      level: currentLevel,
      words
    }
    
    if (currentLevel) {
      result.metadata.levels[currentLevel].pages[1] = pageNum
      result.metadata.levels[currentLevel].wordCount += words.length
    }
    result.metadata.totalWords += words.length
    
    console.log(`Page ${pageNum}: ${words.length} words (Level ${currentLevel})`)
  }
  
  await fs.writeFile(OUTPUT_PATH, JSON.stringify(result, null, 2), 'utf-8')
  console.log(`\nDone. Total: ${result.metadata.totalWords} words.`)
}

function parsePageText(text, pageNum) {
  // 把整頁文字按單字邊界切開
  // 策略:從第一個 [...] 開始往回切到上一個單字邊界
  const words = []
  const lines = text.split(/(?=\b[a-zA-Z][a-zA-Z\-\/]*\s*[\[\(])/g)
  
  let wordIdx = 0
  for (const line of lines) {
    const parsed = parseLine(line, pageNum, ++wordIdx)
    if (parsed) words.push(parsed)
  }
  
  return words
}

function parseLine(line, pageNum, wordIdx) {
  const trimmed = line.trim()
  if (!trimmed) return null
  
  const phoneticMatch = trimmed.match(PHONETIC_PATTERN)
  if (!phoneticMatch) return null
  
  // 單字在音標前
  const wordPart = trimmed.substring(0, phoneticMatch.index).trim()
  // 移除括號標記如 "(2)" 和字尾數字
  const word = wordPart.replace(/\s*\(\d+\)\s*$/, '').replace(/\d+$/, '').trim()
  if (!word || word.length > 50) return null
  
  const phonetic = `[${phoneticMatch[1]}]`
  const rest = trimmed.substring(phoneticMatch.index + phoneticMatch[0].length).trim()
  
  // 從 rest 抓詞性與中文意思
  const posMatch = rest.match(POS_PATTERN)
  const pos = posMatch ? posMatch[0] : ''
  const meaning = posMatch 
    ? rest.substring(posMatch.index + posMatch[0].length).trim()
    : rest
  
  // 中文意思可能含括號、頓號等,清掉尾巴雜訊
  const cleanMeaning = meaning.split(/\s{2,}/)[0].trim()
  
  return {
    id: `p${pageNum}_w${wordIdx}`,
    word,
    phonetic,
    pos,
    meaning: cleanMeaning
  }
}

parsePdf().catch(err => {
  console.error(err)
  process.exit(1)
})
```

**注意:解析邏輯可能要根據實際 PDF 輸出微調。執行後務必檢查前幾頁的 JSON 是否合理。**

## 3. Vite Plugin: memory-saver

這個 plugin **只在 dev 模式運作**,提供 `/api/save-memory` 端點讓瀏覽器存檔案。

```js
// vite-plugins/memory-saver.js
import fs from 'fs/promises'
import path from 'path'

export function memorySaverPlugin() {
  return {
    name: 'memory-saver',
    apply: 'serve', // 只在 dev 啟用
    configureServer(server) {
      server.middlewares.use('/api/save-memory', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end('Method Not Allowed')
          return
        }
        
        let body = ''
        req.on('data', chunk => { body += chunk })
        req.on('end', async () => {
          try {
            // 驗證是合法 JSON
            JSON.parse(body)
            
            const filePath = path.resolve(
              server.config.root, 
              'src/data/memory.json'
            )
            await fs.writeFile(filePath, body, 'utf-8')
            
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ ok: true, bytes: body.length }))
          } catch (e) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: e.message }))
          }
        })
      })
    }
  }
}
```

掛到 `vite.config.js`:

```js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { memorySaverPlugin } from './vite-plugins/memory-saver.js'

export default defineConfig({
  plugins: [vue(), memorySaverPlugin()]
})
```

**驗證:** 啟動 dev server 後,在 Console 輸入:
```js
fetch('/api/save-memory', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: '{"test": 123}'
}).then(r => r.json()).then(console.log)
```
應該回傳 `{ ok: true, bytes: 14 }`,且 `src/data/memory.json` 內容變成 `{"test": 123}`。

## 4. main.js 初始化

```js
// src/main.js
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import './style.css'

const app = createApp(App)
app.use(createPinia())
app.mount('#app')
```

## 5. Vocabulary Store

```js
// src/stores/useVocabularyStore.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import vocabData from '@/data/vocabulary.json'

export const useVocabularyStore = defineStore('vocabulary', () => {
  const data = ref(vocabData)
  
  const pageNumbers = computed(() => 
    Object.keys(data.value.pages).map(Number).sort((a, b) => a - b)
  )
  
  function getPageWords(pageNum) {
    return data.value.pages[pageNum]?.words ?? []
  }
  
  function getPageLevel(pageNum) {
    return data.value.pages[pageNum]?.level ?? null
  }
  
  function getWordById(id) {
    for (const page of Object.values(data.value.pages)) {
      const found = page.words.find(w => w.id === id)
      if (found) return found
    }
    return null
  }
  
  function getRandomWordsFromLevel(level, count, excludeIds = []) {
    const candidates = []
    for (const page of Object.values(data.value.pages)) {
      if (page.level === level) {
        candidates.push(...page.words.filter(w => !excludeIds.includes(w.id)))
      }
    }
    // 隨機抽 count 個
    const shuffled = [...candidates].sort(() => Math.random() - 0.5)
    return shuffled.slice(0, count)
  }
  
  // 依文字尋找單字（支援 a/an 這類斜線多形式）
  function findWordByText(text) {
    if (!text) return null
    const lower = text.toLowerCase().trim()
    for (const page of Object.values(data.value.pages)) {
      for (const w of page.words) {
        const variants = w.word.split('/').map(v => v.trim().toLowerCase())
        if (variants.some(v => v === lower)) return w
      }
    }
    return null
  }

  return { 
    data, pageNumbers, 
    getPageWords, getPageLevel, getWordById, getRandomWordsFromLevel, findWordByText
  }
})
```

完整的 `vite.config.js`（含 GitHub Pages base、alias、HMR 排除設定）:

```js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import { memorySaverPlugin } from './vite-plugins/memory-saver.js'

export default defineConfig({
  base: '/vocab-app/',  // GitHub Pages 子路徑（repo 名稱），本地 dev 也能正常運作
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') }
  },
  server: {
    watch: {
      // plugin 寫入這兩個檔案不應觸發 Vite HMR 重載（否則答題後會閃退）
      ignored: ['**/src/data/memory.json', '**/src/error.log']
    }
  },
  plugins: [vue(), memorySaverPlugin()]
})
```

## 6. Memory Store (核心 — 三層儲存策略)

```js
// src/stores/useMemoryStore.js
import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import memoryData from '@/data/memory.json'
import { calculateNextReview } from '@/utils/srs'

const STORAGE_KEY = 'vocab-memory-v1'

export const useMemoryStore = defineStore('memory', () => {
  // 三層儲存策略:
  // 1. ref (記憶體) — Vue 響應式
  // 2. localStorage — 瞬間寫,容錯快
  // 3. memory.json (透過 /api/save-memory) — 持久化,給 git 同步用
  
  const records = ref(loadInitial())
  
  function loadInitial() {
    // 優先讀 localStorage(可能比檔案新)
    try {
      const local = localStorage.getItem(STORAGE_KEY)
      if (local) {
        const parsed = JSON.parse(local)
        // 跟檔案 merge,以較新的 lastReview 為準
        return mergeRecords(memoryData, parsed)
      }
    } catch {}
    return { ...memoryData }
  }
  
  function mergeRecords(fileRecords, localRecords) {
    const merged = { ...fileRecords }
    for (const [id, local] of Object.entries(localRecords)) {
      const file = merged[id]
      if (!file || (local.lastReview ?? 0) > (file.lastReview ?? 0)) {
        merged[id] = local
      }
    }
    return merged
  }
  
  // 自動同步:寫 localStorage(瞬間)+ 寫檔案(debounce)
  let fileSyncTimer = null
  watch(records, (val) => {
    // 1. 立即寫 localStorage
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(val))
    } catch (e) {
      console.warn('localStorage write failed', e)
    }
    
    // 2. debounce 寫檔案
    clearTimeout(fileSyncTimer)
    fileSyncTimer = setTimeout(() => {
      if (import.meta.env.DEV) {
        fetch('/api/save-memory', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(val, null, 2)
        }).catch(err => console.warn('File sync failed', err))
      }
    }, 1000)
  }, { deep: true })
  
  function recordAnswer(wordId, word, isCorrect) {
    const existing = records.value[wordId] ?? {
      word, level: 0, correctCount: 0, wrongCount: 0,
      lastReview: 0, nextReview: 0, isFamiliar: false
    }
    
    if (isCorrect) {
      existing.correctCount++
      existing.level = Math.min(5, existing.level + 1)
    } else {
      existing.wrongCount++
      existing.level = Math.max(0, existing.level - 1)
    }
    existing.lastReview = Date.now()
    existing.nextReview = calculateNextReview(existing.level)
    existing.isFamiliar = existing.level >= 4
    
    records.value = { ...records.value, [wordId]: existing }
  }
  
  function markFamiliarity(wordId, word, level) {
    // 給 FlashCard 用:不熟=0, 普通=2, 熟悉=4
    const existing = records.value[wordId] ?? {
      word, level: 0, correctCount: 0, wrongCount: 0,
      lastReview: 0, nextReview: 0, isFamiliar: false
    }
    existing.level = level
    existing.lastReview = Date.now()
    existing.nextReview = calculateNextReview(level)
    existing.isFamiliar = level >= 4
    records.value = { ...records.value, [wordId]: existing }
  }
  
  function getDueWords() {
    const now = Date.now()
    return Object.entries(records.value)
      .filter(([_, r]) => r.nextReview <= now && !r.isFamiliar)
      .map(([id, r]) => ({ id, ...r }))
  }
  
  function getRecord(wordId) {
    return records.value[wordId]
  }
  
  async function resetAll() {
    records.value = {}
    localStorage.removeItem(STORAGE_KEY)
    if (import.meta.env.DEV) {
      await fetch('/api/save-memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}'
      })
    }
  }
  
  return { 
    records, 
    recordAnswer, markFamiliarity, 
    getDueWords, getRecord, resetAll 
  }
})
```

## 7. SRS 演算法 (`src/utils/srs.js`)

```js
const ONE_DAY = 24 * 60 * 60 * 1000

const INTERVALS = [
  0,                  // level 0: 立刻複習
  1 * ONE_DAY,        // level 1: 1 天
  3 * ONE_DAY,        // level 2: 3 天
  7 * ONE_DAY,        // level 3: 7 天
  14 * ONE_DAY,       // level 4: 14 天(算熟練)
  30 * ONE_DAY,       // level 5: 30 天
]

export function calculateNextReview(level) {
  const interval = INTERVALS[Math.min(level, INTERVALS.length - 1)]
  return Date.now() + interval
}

export function buildPracticeQueue(pageWords, dueWords, totalSize = 10) {
  const dueCount = Math.min(Math.floor(totalSize * 0.3), dueWords.length)
  const pageCount = totalSize - dueCount
  
  const dueShuffled = shuffle(dueWords).slice(0, dueCount)
  const pageShuffled = shuffle(pageWords).slice(0, pageCount)
  
  return shuffle([...dueShuffled, ...pageShuffled])
}

export function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
```

## 8. Speech Composable

兩個函式：`speak(word, audioUrlOrAccent)` 發音單字，`speakText(text, accent)` 朗讀整句。

```js
// src/composables/useSpeech.js
import { ref } from 'vue'

const audioCache = {}         // module-level，整個 session 共用
const isPlaying = ref(false)  // module-level，避免多個元件各自持有

export function useSpeech() {
  // 直接用 Web Speech API 朗讀文字（例句整句用，rate 0.85 較自然）
  function speakText(text, accent) {
    if (!window.speechSynthesis) return
    speechSynthesis.cancel()
    const utter = new SpeechSynthesisUtterance(text)
    utter.lang = accent === 'uk' ? 'en-GB' : 'en-US'
    utter.rate = 0.85
    speechSynthesis.speak(utter)
  }

  // 發音單字：
  //   audioUrlOrAccent = mp3 URL → 播放 Audio，失敗 fallback Web Speech
  //   audioUrlOrAccent = 'us'/'uk' → 直接 Web Speech
  async function speak(word, audioUrlOrAccent) {
    if (typeof audioUrlOrAccent === 'string' && audioUrlOrAccent.startsWith('http')) {
      const cacheKey = audioUrlOrAccent
      let audio = audioCache[cacheKey]
      if (!audio) {
        audio = new Audio(audioUrlOrAccent)
        audioCache[cacheKey] = audio
      }
      isPlaying.value = true
      audio.onended = () => { isPlaying.value = false }
      audio.onerror = () => { speakText(word, 'us'); isPlaying.value = false }
      try { await audio.play() } catch { speakText(word, 'us'); isPlaying.value = false }
    } else {
      speakText(word, audioUrlOrAccent || 'us')
    }
  }

  return { speak, speakText, isPlaying }
}
```

**呼叫方式：**
```js
// 用 mp3 URL（從 useDictionary 拿到的 apiData.phonetics.us）
speak(word.word, apiData?.phonetics?.us)

// 直接 Web Speech
speak(word.word, 'us')
speak(word.word, 'uk')

// 整句朗讀
speakText(exampleSentence, 'us')
speakText(exampleSentence, 'uk')
```

## 9. Dictionary Composable(查例句 + 音標 + mp3)

函式名稱是 `fetchWord`（不是 `lookup`）。回傳 `{ phonetics: { text, us, uk }, examples: string[] }`。

```js
// src/composables/useDictionary.js
import { ref } from 'vue'

const sessionCache = {}  // module-level，整個 session 共用（避免重複打 API）

export function useDictionary() {
  const loading = ref(false)
  const error = ref(false)

  async function fetchWord(word) {
    if (sessionCache[word]) return sessionCache[word]
    loading.value = true
    error.value = false
    try {
      const res = await fetch(
        `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`
      )
      if (!res.ok) throw new Error()
      const data = await res.json()
      const result = extractData(data[0])
      sessionCache[word] = result
      return result
    } catch {
      error.value = true
      return null
    } finally {
      loading.value = false
    }
  }

  function extractData(entry) {
    if (!entry) return null

    const phonetics = {
      text: entry.phonetic ?? '',
      us: entry.phonetics?.find(p => p.audio?.includes('-us'))?.audio ?? '',
      uk: entry.phonetics?.find(p => p.audio?.includes('-uk'))?.audio ?? '',
    }

    // 收集所有例句字串，優先選短句(< 15 字)，最多 3 句
    const all = []
    for (const m of entry.meanings ?? []) {
      for (const d of m.definitions ?? []) {
        if (d.example) all.push(d.example)
      }
    }
    const short = all.filter(s => s.split(' ').length < 15)
    const long  = all.filter(s => s.split(' ').length >= 15)
    const examples = [...short, ...long].slice(0, 3)

    return { phonetics, examples }
  }

  return { fetchWord, loading, error }
}
```

**在 WordDetail 中使用：**
```js
const { fetchWord, loading, error } = useDictionary()
const apiData = ref(null)

onMounted(async () => {
  apiData.value = await fetchWord(props.word.word)
})
```

存取方式：`apiData.value?.phonetics?.us`、`apiData.value?.examples`（string[]）。

## 10. Vue 元件範例

### WordCard (含 hover tooltip + 發音按鈕)

Tooltip 用 Vue 響應式控制顯示（不是 CSS `:hover`），200ms 延遲防止移向按鈕時閃消。

```vue
<script setup>
import { ref } from 'vue'
import { useSpeech } from '@/composables/useSpeech'

const props = defineProps({ word: Object })
defineEmits(['click'])

const { speak } = useSpeech()
const showTooltip = ref(false)
let hideTimer = null

function onMouseenter() {
  clearTimeout(hideTimer)
  showTooltip.value = true
}
function onMouseleave() {
  hideTimer = setTimeout(() => { showTooltip.value = false }, 200)
}
</script>

<template>
  <div class="word-card" @click="$emit('click', word)" @mouseenter="onMouseenter" @mouseleave="onMouseleave">
    <span class="word-text">{{ word.word }}</span>
    <div v-show="showTooltip" class="tooltip">
      <div class="tooltip-info">
        <span class="pos">{{ word.pos }}</span>
        <span class="meaning">{{ word.meaning }}</span>
      </div>
      <div class="tooltip-speak">
        <!-- @mousedown.stop 防止 tooltip 消失，@click.stop 防止觸發卡片點擊 -->
        <button class="ts-btn" @mousedown.stop @click.stop="speak(word.word, 'us')">🇺🇸</button>
        <button class="ts-btn" @mousedown.stop @click.stop="speak(word.word, 'uk')">🇬🇧</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.word-card {
  position: relative;
  padding: 0.6rem 0.9rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s;
}
.word-card:hover { border-color: var(--color-primary); }
.word-text { font-size: 0.95rem; font-weight: 500; }
.tooltip {
  position: absolute;
  bottom: calc(100% + 6px);
  left: 50%;
  transform: translateX(-50%);
  background: var(--color-tooltip-bg);
  color: var(--color-tooltip-text);
  border-radius: 6px;
  padding: 0.4rem 0.6rem;
  white-space: nowrap;
  font-size: 0.82rem;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.ts-btn {
  background: none;
  border: none;
  color: inherit;  /* 重要：button 不繼承 color，要明確設定 */
  cursor: pointer;
  font-size: 0.95rem;
  padding: 0.05rem 0.15rem;
  line-height: 1;
  transition: transform 0.15s;
}
.ts-btn:hover { transform: scale(1.2); }
</style>
```

### Tab 切換(App.vue)

Tab 切換用 `v-show` 不用 `v-if`（保留各 tab 狀態）。**不用 TabNav 元件**，直接在 App.vue 內寫。

```vue
<script setup>
import { ref } from 'vue'
import LearningTab from './components/learning/LearningTab.vue'
import PracticeTab from './components/practice/PracticeTab.vue'

const activeTab = ref('learning')
</script>

<template>
  <div class="app">
    <header>
      <nav>
        <button :class="{ active: activeTab === 'learning' }" @click="activeTab = 'learning'">單字學習</button>
        <button :class="{ active: activeTab === 'practice' }" @click="activeTab = 'practice'">單字練習</button>
      </nav>
    </header>
    <LearningTab v-show="activeTab === 'learning'" />
    <PracticeTab v-show="activeTab === 'practice'" />
  </div>
</template>
```

**關鍵點：用 `v-show` 不是 `v-if`**，切 tab 保留各自狀態。

## 11. 深色模式 CSS Variables

所有顏色都用 CSS variables，不寫死值。`[data-theme="dark"]` 覆蓋 `:root` 定義。

```css
/* src/style.css */
:root {
  --color-primary: #4a9eff;
  --color-bg: #f5f7fa;
  --color-surface: #ffffff;
  --color-text: #2c3e50;
  --color-muted: #666666;
  --color-border: #e0e0e0;
  --color-border-light: #dddddd;
  --color-tooltip-bg: #2c3e50;
  --color-tooltip-text: #ffffff;
  --color-correct-bg: #d3f9d8;
  --color-correct-border: #51cf66;
  --color-correct-text: #2b8a3e;
  --color-wrong-bg: #ffe3e3;
  --color-wrong-border: #ff6b6b;
  --color-wrong-text: #c92a2a;
  --color-translation: #777777;
  --color-shadow: rgba(0,0,0,0.08);
  --color-shadow-strong: rgba(0,0,0,0.15);
}
[data-theme="dark"] {
  --color-primary: #5aadff;
  --color-bg: #1a1a2e;
  --color-surface: #252538;
  --color-text: #e2e2f0;
  --color-muted: #9a9ab0;
  --color-border: #3a3a58;
  --color-border-light: #2e2e4a;
  --color-tooltip-bg: #3d3d60;
  --color-tooltip-text: #ffffff;
  --color-correct-bg: rgba(46,160,67,0.2);
  --color-correct-border: #40c057;
  --color-correct-text: #69db7c;
  --color-wrong-bg: rgba(220,53,69,0.15);
  --color-wrong-border: #e03131;
  --color-wrong-text: #ff8787;
  --color-translation: #aaaacc;
  --color-shadow: rgba(0,0,0,0.35);
  --color-shadow-strong: rgba(0,0,0,0.5);
}

/* 全域修正：button/select 在深色模式下顏色不繼承的問題 */
select { color: var(--color-text); background: var(--color-surface); }
```

防閃白 inline script（放 `index.html` `<head>` 最前面，在 Vue mount 之前執行）：

```html
<script>
  const t = localStorage.getItem('vocab-theme') || 'light'
  document.documentElement.setAttribute('data-theme', t)
</script>
```

## 12. Error Logging

```js
// src/utils/logError.js
export async function logError(message, stack = '') {
  console.error('[vocab-app]', message, stack)
  try {
    await fetch('/api/log-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: String(message), stack: String(stack), timestamp: new Date().toISOString() })
    })
  } catch {}
  // 只在 dev 有效，prod 只寫 console
}
```

在 `onErrorCaptured` 或 catch 區塊中呼叫：

```js
import { logError } from '@/utils/logError'

onErrorCaptured((err, _instance, info) => {
  logError(`[ComponentName] uncaught in ${info}: ${err.message}`, err.stack)
  return true
})
```

## 13. 開發流程建議順序

依序做完每一步再進下一步:

1. ✅ **專案骨架** — `npm create vite@latest` → `npm install pinia pdfjs-dist`
2. ✅ **PDF 解析** — 寫 parse-pdf.js,執行,**檢查 vocabulary.json 前 50 筆內容對不對**
3. ✅ **Vite plugin** — 寫 memory-saver,Console 測試 fetch 能寫檔
4. ✅ **Stores** — vocabulary + memory(空殼,先確認響應式正常)
5. ✅ **TabNav + App.vue** — 切 tab 邏輯
6. ✅ **Learning Tab** — PageSelector → WordGrid → WordCard hover
7. ✅ **WordDetail** — 整合 useSpeech + useDictionary
8. ✅ **Practice Tab** — FlashCard 先做,再做 QuizCard
9. ✅ **SRS 接上** — markFamiliarity / recordAnswer 寫進 store
10. ✅ **重置進度按鈕** — 在某個角落加

**每步驗證:**
- 每步做完先 `npm run dev` 確認沒 console error
- 改 store 後手動測一次:答題 → 看 src/data/memory.json 是否 1 秒後變動

## 14. 不要在沒看 CLAUDE.md 的情況下動手

每次 session 開始,先 `view CLAUDE.md` 一次。專案規範可能會調整,不要憑記憶寫。
