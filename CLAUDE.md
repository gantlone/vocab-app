# CLAUDE.md

> 此檔案提供給 Claude Code 在這個 repo 工作時的指引。**每次開始新對話前先讀這份檔案。**

## 專案概述

**個人使用**的高中 7000 單字背誦網頁。純本地端開發,只在 `npm run dev` 環境下使用,**不部署到外網**。資料來源:`docs/高中7000單.pdf`,內容按 Level 1-6 與頁碼分組。

**核心定位:**
- 自己學英文用,不上架、不公開
- 用 VSCode 開發,`npm run dev` 在本地跑
- 進度可透過 Git 在多台電腦間同步

## 技術棧

- **建構工具:** Vite 5+
- **框架:** Vue 3 (Composition API + `<script setup>` 語法)
- **狀態管理:** Pinia
- **樣式:** 原生 CSS + scoped(不引入 UI 框架)
- **PDF 解析:** 一次性 Node.js 腳本(`pdfjs-dist` 套件),**不在 runtime 解析**
- **發音 API:**
  - 主要:`https://api.dictionaryapi.dev/api/v2/entries/en/{word}`(免費、無需 key、有真人發音 mp3 + 例句)
  - Fallback:瀏覽器內建 `window.speechSynthesis`(Web Speech API)
- **學習進度儲存:** 自製 Vite plugin 提供 `/api/save-memory` 端點,自動寫入 `src/data/memory.json`

## 為什麼可以自動寫檔?

瀏覽器無法直接寫入專案資料夾(安全限制)。但 Vite dev server 跑在 Node.js 上,Node.js 可以寫檔。所以我們做一個 Vite plugin 提供 HTTP 端點當橋樑:

```
瀏覽器 fetch('/api/save-memory', POST)
    ↓
Vite dev server 收到請求
    ↓
Node.js 用 fs.writeFile() 寫 src/data/memory.json ✅
```

**重要:** 這個方案**只在 `npm run dev` 下有效**。production build 不會有這個端點。本專案不部署,所以沒問題。

## 資料夾結構

```
vocab-app/
├── docs/
│   └── 高中7000單.pdf          # 原始 PDF(不被 app 使用,只是備份)
├── scripts/
│   └── parse-pdf.js            # 一次性執行,把 PDF 轉成 JSON
├── src/
│   ├── App.vue                 # 根組件,tab 切換
│   ├── main.js
│   ├── data/
│   │   ├── vocabulary.json     # 預先解析好的所有單字(按頁分組)
│   │   └── memory.json         # 學習紀錄(會被 Vite plugin 自動更新)
│   ├── stores/
│   │   ├── useVocabularyStore.js
│   │   └── useMemoryStore.js
│   ├── composables/
│   │   ├── useSpeech.js
│   │   └── useDictionary.js
│   ├── components/
│   │   ├── TabNav.vue
│   │   ├── learning/
│   │   │   ├── LearningTab.vue
│   │   │   ├── PageSelector.vue
│   │   │   ├── WordGrid.vue
│   │   │   ├── WordCard.vue
│   │   │   └── WordDetail.vue
│   │   └── practice/
│   │       ├── PracticeTab.vue
│   │       ├── PracticeSelector.vue
│   │       ├── FlashCard.vue
│   │       └── QuizCard.vue
│   └── utils/
│       └── srs.js              # 艾賓浩斯演算法
├── vite-plugins/
│   └── memory-saver.js         # 自製 plugin,提供 /api/save-memory
├── public/
├── index.html
├── package.json
├── vite.config.js
├── .gitignore
└── CLAUDE.md
```

## 資料格式

### vocabulary.json
```json
{
  "metadata": {
    "totalPages": 75,
    "totalWords": 6480,
    "levels": {
      "1": { "pages": [1, 11], "wordCount": 1080 },
      "2": { "pages": [12, 22], "wordCount": 1080 }
    }
  },
  "pages": {
    "1": {
      "level": 1,
      "words": [
        {
          "id": "p1_w1",
          "word": "a/an",
          "phonetic": "[æn]",
          "pos": "art.",
          "meaning": "一"
        }
      ]
    }
  }
}
```

### memory.json
```json
{
  "p1_w1": {
    "word": "a/an",
    "level": 0,
    "lastReview": 1718000000000,
    "nextReview": 1718086400000,
    "correctCount": 3,
    "wrongCount": 1,
    "isFamiliar": false
  }
}
```

初始狀態為 `{}`(空物件)。

## 兩大頁籤功能

### 頁籤 1:單字學習

1. **頁碼選擇器(PageSelector):**
   - 列出所有頁碼,顯示該頁所屬 Level
   - 點選後切換到該頁的 WordGrid

2. **單字網格(WordGrid + WordCard):**
   - 顯示該頁所有單字方塊
   - **hover tooltip** 顯示中文意思 + 詞性(原生 CSS `:hover`)
   - 點擊單字 → 顯示 `WordDetail`

3. **單字詳細頁(WordDetail):**
   - 大字顯示英文 + KK 音標(從 vocabulary.json)
   - 中文意思 + 詞性
   - 美式/英式發音按鈕(useSpeech)
   - 3-5 個例句(useDictionary 從 Dictionary API 抓)
   - API 失敗時顯示「無例句資料,但可以聽發音」
   - 「返回」按鈕回到 WordGrid

### 頁籤 2:單字練習

1. **練習選擇器(PracticeSelector):**
   - 選一個頁碼
   - 選模式:單字卡 / 測驗

2. **單字卡模式(FlashCard):**
   - 卡片正面:英文單字
   - 點擊翻面:顯示中文 + 詞性
   - 三顆按鈕:「不熟」「普通」「熟悉」(更新 SRS)
   - 「下一張」自動進入下一題

3. **測驗模式(QuizCard):**
   - 顯示一個英文單字
   - 四個中文選項(1 正確 + 3 從同頁/同 level 隨機)
   - 答錯立刻顯示正確答案 + 自動降級 SRS
   - 答對加分 + 升級 SRS

4. **艾賓浩斯複習混入:**
   - 進入練習頁時,從到期池抽 30% 混入當頁單字
   - 演算法詳見 `src/utils/srs.js`

## Tab 切換策略

**用 `v-show` 不是 `v-if`**,切換 tab 保留各自狀態(學到一半切去練習,切回來還在原本單字)。**不引入 Vue Router**。

## 開發指令

```bash
# 第一次設定
npm install
npm run parse-pdf       # 跑一次,產生 src/data/vocabulary.json

# 開發
npm run dev             # http://localhost:5173

# 不會用到但留著
npm run build
npm run preview
```

## Git 工作流

### 哪些檔案進 Git?

✅ 進 Git:
- 所有原始碼(`src/`)
- `src/data/vocabulary.json`(教材)
- `src/data/memory.json`(學習進度)
- `docs/高中7000單.pdf`(備份)
- `vite-plugins/`
- 設定檔(`vite.config.js`, `package.json`, etc.)

❌ 不進 Git:
- `node_modules/`
- `dist/`
- `.DS_Store`

### .gitignore
```
node_modules/
dist/
.DS_Store
.vscode/
*.log
```

### 多電腦同步流程

A 電腦學習 → 同步到 B 電腦:

```bash
# A 電腦(已學了一段時間,memory.json 已被 plugin 自動更新)
git add .
git commit -m "update learning progress"
git push

# B 電腦
git pull
npm install   # 第一次才需要
npm run dev   # 開啟後自動讀取 memory.json,進度同步完成
```

### 清空學習進度

App 內加一顆「重置進度」按鈕,點下去執行:
```js
async function resetMemory() {
  if (!confirm('確定要清空所有學習進度?')) return
  await fetch('/api/save-memory', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}'
  })
  localStorage.removeItem('vocab-memory-v1')
  location.reload()
}
```

## 程式撰寫規範

### Vue
- **一律用 `<script setup>` + Composition API**,不要用 Options API
- 元件命名:PascalCase(`WordCard.vue`)
- Props 用 `defineProps`,Emits 用 `defineEmits`
- 跨元件狀態用 Pinia store,**不要 props drilling 超過兩層**

### CSS
- Scoped CSS,顏色用 CSS variables
- **不要引入 Tailwind / UnoCSS**(專案太小)
- 響應式用 `clamp()` 跟 `grid-template-columns: repeat(auto-fill, minmax(...))`

### 狀態管理
- Pinia store 用 setup 語法:`defineStore('name', () => { ... })`
- localStorage 讀寫**封裝在 store 內**,元件不要直接碰 localStorage
- memory store 寫入時,同時:
  1. 更新 ref 觸發響應式
  2. 寫 localStorage(瞬間,容錯)
  3. 呼叫 `/api/save-memory`(debounce 1 秒,寫實體檔案)

### 不要做的事
- ❌ 不要引入 Vue Router
- ❌ 不要引入 Axios(`fetch` 就夠)
- ❌ 不要引入 Element Plus / Naive UI / Vuetify
- ❌ 不要在 runtime 解析 PDF
- ❌ 不要把 vocabulary.json 放 `public/`(放 `src/data/` 才能被 Vite 打包優化)
- ❌ **不要建立 `.env`** — 本專案用的 API 都不需要 key

## 已知坑

1. **Dictionary API 限流:** 偶爾 429,要在 useDictionary 內做 session cache
2. **Web Speech 在 Safari:** 首次 `speak()` 可能無聲,需 user gesture 觸發
3. **PDF 解析格式不一致:** `good-bye/goodbye/bye-bye`、`account1`、`bear (2)` 等特殊格式,parse script 要容錯
4. **Vite plugin 只在 dev 有效:** production build 沒有 `/api/save-memory`,但本專案不會部署所以無所謂

## 開發順序建議

當接到「實作此 App」任務,依序:

1. `npm create vite@latest` → Vue → JavaScript
2. 安裝套件:`vue`, `pinia`, `pdfjs-dist`(devDep)
3. 寫 `scripts/parse-pdf.js`,執行確認 vocabulary.json 格式正確
4. 寫 `vite-plugins/memory-saver.js`,測試 POST 能寫檔
5. 建 stores(vocabulary, memory)
6. 建 learning tab(PageSelector → WordGrid → WordCard → WordDetail)
7. 建 practice tab(Selector → FlashCard → QuizCard)
8. 整合 SRS + 發音 + 例句
9. 加重置進度按鈕

**每個階段完成都先 `npm run dev` 驗證再做下一步,不要一次寫完所有元件。**

## 給 Claude Code 的提示

- 開始任何工作前先 `view CLAUDE.md` 和 `view SKILL.md`
- 不確定資料夾結構就回來看本檔
- 程式碼風格、Pinia store 模板、Vite plugin 寫法都在 SKILL.md
- 不要憑記憶亂寫,規範可能會更新
