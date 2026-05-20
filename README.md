# 高中 7000 單字背誦 App

個人用的英文單字學習網頁，基於台灣高中 7000 單字（Level 1–6）。

**線上版本：** https://gantlone.github.io/vocab-app/

---

## 功能介紹

### 單字學習
- 依頁碼瀏覽所有單字，每頁約 80–100 個
- 滑鼠懸停單字卡，顯示詞性、中文意思，以及 🇺🇸 🇬🇧 發音按鈕
- 點擊單字進入詳細頁：
  - KK 音標、美式／英式真人 mp3 發音（來自 Dictionary API）
  - 最多 3 句篩選過的短例句
  - 每句可點 ▶ 展開中文翻譯（MyMemory API，lazy load）
  - 每句旁有 🇺🇸 🇬🇧 按鈕朗讀整句
  - 例句內反白單字，可查詞性與中文意思並直接發音

### 單字練習（含艾賓浩斯 SRS）
- **單字卡模式**：正面英文，點擊翻面看中文，標記「不熟／普通／熟悉」
- **測驗模式**：四選一中文選項，答對 / 答錯即時顯示並記分
- 每次練習自動混入「到期複習單字」（佔 30%），強化記憶曲線

### 其他
- 🌙 / ☀️ 深色 / 淺色主題切換，偏好自動記憶
- 學習進度存於 localStorage，透過 Git 可在多台電腦同步（見下方說明）
- 手機友善：頁碼選擇自動切換為下拉選單

---

## 本地端安裝與執行

### 環境需求
- Node.js 18+
- npm

### 步驟

```bash
# 1. clone 專案
git clone https://github.com/gantlone/vocab-app.git
cd vocab-app

# 2. 安裝套件
npm install

# 3. 啟動開發伺服器
npm run dev
```

開啟瀏覽器前往 `http://localhost:5173`。

> **注意：** 僅在 `npm run dev` 模式下，學習進度才會自動寫回 `src/data/memory.json`（透過自製 Vite plugin）。  
> GitHub Pages 線上版使用 localStorage，不寫檔案。

---

## 多台電腦同步學習進度

```bash
# A 電腦學習後
git add src/data/memory.json
git commit -m "update learning progress"
git push

# B 電腦
git pull
npm run dev   # 啟動後自動讀取最新 memory.json
```

---

## 技術棧

| 項目 | 技術 |
|------|------|
| 框架 | Vue 3（Composition API + `<script setup>`） |
| 建構工具 | Vite 5 |
| 狀態管理 | Pinia |
| 樣式 | 原生 CSS + scoped（無 UI 框架） |
| 單字資料 | `src/data/vocabulary.json`（預先解析自 [大考中心字彙表 PDF](https://www.tyjh.tyc.edu.tw/uploads/1552438563395h2EQgNj0.pdf)） |
| 發音 | Dictionary API mp3 + Web Speech API fallback |
| 例句翻譯 | MyMemory Translation API |
| SRS 演算法 | 自製（`src/utils/srs.js`） |
| 部署 | GitHub Actions → GitHub Pages |

---

## 資料夾結構

```
vocab-app/
├── docs/                    # 原始 PDF 備份
├── scripts/
│   └── parse-pdf.js         # 一次性：PDF 轉 JSON
├── src/
│   ├── components/
│   │   ├── learning/        # 單字學習頁籤相關元件
│   │   └── practice/        # 單字練習頁籤相關元件
│   ├── composables/
│   │   ├── useDictionary.js # Dictionary API（例句、音標、mp3）
│   │   └── useSpeech.js     # 發音（mp3 + Web Speech fallback）
│   ├── data/
│   │   ├── vocabulary.json  # 所有單字（6000+）
│   │   └── memory.json      # 學習紀錄（Git 同步用）
│   ├── stores/
│   │   ├── useVocabularyStore.js
│   │   └── useMemoryStore.js
│   └── utils/
│       └── srs.js           # 艾賓浩斯間隔複習演算法
├── vite-plugins/
│   └── memory-saver.js      # 自製 plugin，提供 /api/save-memory 端點
└── .github/workflows/
    └── deploy.yml           # GitHub Pages 自動部署
```

---

## 重置學習進度

點擊右上角「重置進度」按鈕，或手動清空 `src/data/memory.json`：

```bash
echo {} > src/data/memory.json
```

---

## 資料來源

單字資料來自大考中心公布之高中英語文參考詞彙表 PDF：

> https://www.tyjh.tyc.edu.tw/uploads/1552438563395h2EQgNj0.pdf

---

## 著作權與免責聲明

本專案為**個人非商業學習用途**，不做任何商業利用、不對外販售、不收取任何費用。

- 單字資料來源為教育部大考中心公布之公開詞彙表，供教學與學習參考使用。
- 本程式碼為個人自製，不隸屬於任何商業機構或補習班。
- 若有侵權疑慮，請來信聯繫，將立即下架並刪除。

**This project is for personal, non-commercial educational use only.**
No part of this repository may be used for commercial purposes.
