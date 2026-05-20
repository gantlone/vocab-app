import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PDF_PATH = path.resolve(__dirname, '../docs/高中7000單.pdf')
const OUTPUT_PATH = path.resolve(__dirname, '../src/data/vocabulary.json')

// 詞性縮寫清單(在中文意思出現之前的最後一個英文詞性)
const POS_LIST = ['n', 'v', 'vt', 'vi', 'adj', 'adv', 'prep', 'conj', 'pron', 'art', 'aux', 'int', 'phr']
const POS_PATTERN = new RegExp(`\\b(${POS_LIST.join('|')})\\b\\.`, 'i')

async function parsePdf() {
  console.log(`Reading PDF: ${PDF_PATH}`)
  const data = new Uint8Array(await fs.readFile(PDF_PATH))
  const doc = await pdfjsLib.getDocument({ data }).promise
  console.log(`Total pages: ${doc.numPages}`)

  const result = {
    metadata: {
      totalPages: doc.numPages,
      totalWords: 0,
      levels: {}
    },
    pages: {}
  }

  let currentLevel = null
  let globalWordIdx = 0

  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum)
    const viewport = page.getViewport({ scale: 1 })
    const content = await page.getTextContent()

    // 取出所有非空白文字片段及其位置
    const items = content.items
      .filter(it => it.str && it.str.trim().length > 0)
      .map(it => ({
        str: it.str,
        x: Math.round(it.transform[4]),
        y: Math.round(it.transform[5]),
        width: it.width
      }))

    // 偵測 Level 標題(先從全頁文字找)
    const allText = items.map(i => i.str).join(' ')
    const levelMatch = allText.match(/LEVEL\s+(\d+)/i)
    if (levelMatch) {
      currentLevel = parseInt(levelMatch[1])
      if (!result.metadata.levels[currentLevel]) {
        result.metadata.levels[currentLevel] = { pages: [pageNum, pageNum], wordCount: 0 }
      } else {
        result.metadata.levels[currentLevel].pages[1] = pageNum
      }
    } else if (currentLevel && result.metadata.levels[currentLevel]) {
      result.metadata.levels[currentLevel].pages[1] = pageNum
    }

    // 用頁面寬度的一半切分左右欄
    const midX = viewport.width / 2

    // 分成左欄和右欄
    const leftItems = items.filter(it => it.x < midX)
    const rightItems = items.filter(it => it.x >= midX)

    const leftWords = parseColumn(leftItems, pageNum)
    const rightWords = parseColumn(rightItems, pageNum)

    // 左欄全部先,右欄全部後
    const merged = mergeColumns(leftWords, rightWords, pageNum, globalWordIdx)
    globalWordIdx += merged.length

    result.pages[pageNum] = {
      level: currentLevel,
      words: merged
    }

    if (currentLevel && result.metadata.levels[currentLevel]) {
      result.metadata.levels[currentLevel].wordCount += merged.length
    }
    result.metadata.totalWords += merged.length

    console.log(`Page ${pageNum}: ${merged.length} words (L=${leftWords.length} R=${rightWords.length}) Level ${currentLevel}`)
  }

  await fs.writeFile(OUTPUT_PATH, JSON.stringify(result, null, 2), 'utf-8')
  console.log(`\nDone! Total: ${result.metadata.totalWords} words → ${OUTPUT_PATH}`)

  // 印出第一頁前 10 筆供確認
  const firstPage = Object.values(result.pages).find(p => p.words.length > 0)
  if (firstPage) {
    console.log('\n=== Page 1 前 10 筆單字 ===')
    firstPage.words.slice(0, 10).forEach(w => console.log(JSON.stringify(w)))
  }
}


function parseColumn(items, pageNum) {
  // 按 y 降序排列(PDF 座標 y 越大越上方)
  const sorted = [...items].sort((a, b) => (b.y - a.y) || (a.x - b.x))

  // 把 y 差距 < 4 的 items 合成同一列
  const rows = []
  let currentRow = null
  for (const item of sorted) {
    if (!currentRow || Math.abs(item.y - currentRow.y) > 4) {
      currentRow = { y: item.y, parts: [item] }
      rows.push(currentRow)
    } else {
      currentRow.parts.push(item)
      // 更新 y 為平均值(更穩定)
    }
  }

  // 每列的 parts 按 x 排序,合成文字
  const lines = rows.map(row => {
    row.parts.sort((a, b) => a.x - b.x)
    return { y: row.y, text: row.parts.map(p => p.str).join('') }
  })

  // 解析每一列
  const words = []
  for (const line of lines) {
    const parsed = parseLine(line.text)
    if (parsed) words.push({ ...parsed, y: line.y })
  }

  return words
}

function parseLine(text) {
  const trimmed = text.trim()
  if (trimmed.length < 3) return null

  // 濾掉標題列
  if (/LEVEL\s+\d+/i.test(trimmed)) return null
  if (/大考中心|字彙表/.test(trimmed)) return null
  if (/^\d+$/.test(trimmed)) return null

  // 必須包含音標 [...] 才算單字行
  const phoneticMatch = trimmed.match(/\[([^\]]+)\]/)
  if (!phoneticMatch) return null

  // 音標前的部分 = 單字
  const wordRaw = trimmed.substring(0, phoneticMatch.index).trim()
  const word = wordRaw
    .replace(/\s*\(\d+\)\s*$/, '')  // bear (2)
    .replace(/\d+$/, '')             // account1
    .trim()

  if (!word || word.length === 0 || word.length > 60) return null
  if (/^\d/.test(word)) return null  // 純數字開頭

  // 清理音標中的多餘空白(pdfjs 有時把音標字元拆開)
  const phonetic = `[${phoneticMatch[1].replace(/\s+/g, '')}]`

  // 音標後面的部分 = 詞性 + 意思
  const rest = trimmed.substring(phoneticMatch.index + phoneticMatch[0].length).trim()

  // 找最後出現的詞性縮寫(處理 "prep./adv." 的情況)
  // 策略:找到音標後第一個詞性標記
  const posMatch = rest.match(POS_PATTERN)
  const pos = posMatch ? posMatch[0] : ''

  // 中文意思
  const meaningRaw = posMatch
    ? rest.substring(posMatch.index + posMatch[0].length).trim()
    : rest

  // 中文意思只取到下一個英文單字開頭前(防止混入下一條的資料)
  // 如果有兩個單字在同一列(少見),只取第一個意思
  const meaning = meaningRaw
    .replace(/\s+[a-zA-Z][\w\-\/]*\s*[\[\(].*$/, '')  // 截掉下一個可能的單字
    .trim()

  if (!meaning) return null

  return { word, phonetic, pos, meaning }
}

function mergeColumns(leftWords, rightWords, pageNum, startIdx) {
  // 左欄全部先(由上到下),右欄全部後(由上到下),不做跨欄排序
  const all = [...leftWords, ...rightWords]
  return all.map((w, i) => ({
    id: `p${pageNum}_w${startIdx + i + 1}`,
    word: w.word,
    phonetic: w.phonetic,
    pos: w.pos,
    meaning: w.meaning
  }))
}

parsePdf().catch(err => {
  console.error('Parse failed:', err)
  process.exit(1)
})
