// 診斷腳本:不修改任何東西,只輸出報告
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PDF_PATH = path.resolve(__dirname, '../docs/高中7000單.pdf')
const VOCAB_PATH = path.resolve(__dirname, '../src/data/vocabulary.json')

const POS_LIST = ['n', 'v', 'vt', 'vi', 'adj', 'adv', 'prep', 'conj', 'pron', 'art', 'aux', 'int', 'phr']
const POS_PATTERN = new RegExp(`\\b(${POS_LIST.join('|')})\\b\\.`, 'i')

async function main() {
  const pdfData = new Uint8Array(await fs.readFile(PDF_PATH))
  const doc = await pdfjsLib.getDocument({ data: pdfData }).promise
  const vocab = JSON.parse(await fs.readFile(VOCAB_PATH, 'utf-8'))

  // ── 1. 每頁單字數表格 ──────────────────────────────────────────────
  console.log('\n════════════════════════════════════════')
  console.log('§1  每頁單字數（目前 parse 結果 vs 原始行數）')
  console.log('════════════════════════════════════════')
  console.log('Page | Level | Parsed | RawLines | HasPhonetic | Flag')
  console.log('-----|-------|--------|----------|-------------|-----')

  const anomalyPages = []
  const normalPages  = []

  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum)
    const viewport = page.getViewport({ scale: 1 })
    const content = await page.getTextContent()

    const items = content.items.filter(it => it.str && it.str.trim())
    const rawText = items.map(i => i.str).join(' ')

    // 算原始 text 中有多少個 [ (近似音標數量)
    const phoneticCount = (rawText.match(/\[/g) || []).length
    // 算原始行數(pdfjs items 中 y 座標不重複的數量)
    const uniqueY = new Set(items.map(i => Math.round(i.transform[5]))).size

    const parsed = vocab.pages[pageNum]?.words.length ?? 0
    const level  = vocab.pages[pageNum]?.level ?? '?'
    const flag   = parsed < 70 ? ' ← LOW' : ''

    console.log(
      `  ${String(pageNum).padStart(2)} |   ${level}   |   ${String(parsed).padStart(3)}  |    ${String(uniqueY).padStart(3)}     |     ${String(phoneticCount).padStart(3)}       |${flag}`
    )

    if (parsed < 70) anomalyPages.push(pageNum)
    else normalPages.push(pageNum)
  }

  // ── 2. 原始文字抽樣 ───────────────────────────────────────────────
  // 正常頁: 取前三個 normal pages (跳過第1頁,已看過)
  const sampleNormal  = normalPages.filter(p => p !== 1).slice(0, 3)
  // 異常頁: 取前三個
  const sampleAnomaly = anomalyPages.slice(0, 3)

  const samplePages = [
    ...sampleNormal.map(p => ({ page: p, type: 'NORMAL' })),
    ...sampleAnomaly.map(p => ({ page: p, type: 'ANOMALY' }))
  ]

  console.log('\n════════════════════════════════════════')
  console.log('§2  原始 text items 抽樣（左欄前 20 rows）')
  console.log('════════════════════════════════════════')

  for (const { page: pageNum, type } of samplePages) {
    const page = await doc.getPage(pageNum)
    const viewport = page.getViewport({ scale: 1 })
    const content = await page.getTextContent()

    const midX = viewport.width / 2
    const items = content.items
      .filter(it => it.str && it.str.trim())
      .map(it => ({ str: it.str, x: Math.round(it.transform[4]), y: Math.round(it.transform[5]) }))
      .filter(it => it.x < midX)                      // 只看左欄
      .sort((a, b) => (b.y - a.y) || (a.x - b.x))

    // 合成行
    const rows = []
    let cur = null
    for (const it of items) {
      if (!cur || Math.abs(it.y - cur.y) > 4) { cur = { y: it.y, parts: [it] }; rows.push(cur) }
      else cur.parts.push(it)
    }
    const lines = rows.map(r => {
      r.parts.sort((a, b) => a.x - b.x)
      return r.parts.map(p => p.str).join('')
    })

    const parsedCount = vocab.pages[pageNum]?.words.length ?? 0
    console.log(`\n── Page ${pageNum} [${type}] parsed=${parsedCount} ──`)
    lines.slice(0, 20).forEach((l, i) => {
      const hasPhonetic = /\[/.test(l)
      const hit = hasPhonetic ? '✓' : ' '
      console.log(`  ${hit} ${String(i+1).padStart(2)}: ${l}`)
    })
  }

  // ── 3. 特殊格式檢查 ───────────────────────────────────────────────
  console.log('\n════════════════════════════════════════')
  console.log('§3  特殊格式掃描（全 PDF 原始文字）')
  console.log('════════════════════════════════════════')

  // 收集全部頁的原始行文字 (左+右欄合并)
  const allLines = []
  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum)
    const viewport = page.getViewport({ scale: 1 })
    const content = await page.getTextContent()
    const items = content.items
      .filter(it => it.str && it.str.trim())
      .map(it => ({ str: it.str, x: Math.round(it.transform[4]), y: Math.round(it.transform[5]) }))
      .sort((a, b) => (b.y - a.y) || (a.x - b.x))

    const rows = []
    let cur = null
    for (const it of items) {
      if (!cur || Math.abs(it.y - cur.y) > 4) { cur = { y: it.y, parts: [it] }; rows.push(cur) }
      else cur.parts.push(it)
    }
    rows.forEach(r => {
      r.parts.sort((a, b) => a.x - b.x)
      allLines.push({ page: pageNum, text: r.parts.map(p => p.str).join('') })
    })
  }

  // 3a. 多別名 / 含斜線單字
  const slashLines = allLines.filter(l => /\[/.test(l.text) && /\//.test(l.text.split('[')[0]))
  console.log(`\n[3a] 音標前含 "/" 的行 (多別名): ${slashLines.length} 筆`)
  slashLines.slice(0, 10).forEach(l => console.log(`  p${l.page}: ${l.text}`))

  // 3b. 有音標但沒抓到詞性的行
  const noPosLines = allLines.filter(l => {
    if (!/\[/.test(l.text)) return false
    const after = l.text.slice(l.text.indexOf(']') + 1)
    return !POS_PATTERN.test(after)
  })
  console.log(`\n[3b] 有音標但缺詞性的行: ${noPosLines.length} 筆`)
  noPosLines.slice(0, 15).forEach(l => console.log(`  p${l.page}: ${l.text}`))

  // 3c. 同一列出現兩個以上音標 [ (多音標行: actor/actress 型)
  const multiPhoneticLines = allLines.filter(l => (l.text.match(/\[/g) || []).length >= 2)
  console.log(`\n[3c] 同行出現 2+ 個音標 (actor/actress 型): ${multiPhoneticLines.length} 筆`)
  multiPhoneticLines.slice(0, 10).forEach(l => console.log(`  p${l.page}: ${l.text}`))

  // 3d. 片語 (音標前有空格的多詞單字)
  const phraseLines = allLines.filter(l => {
    if (!/\[/.test(l.text)) return false
    const word = l.text.slice(0, l.text.indexOf('[')).trim()
    return word.includes(' ') && !/[/\\]/.test(word)
  })
  console.log(`\n[3d] 片語類單字 (音標前有空格): ${phraseLines.length} 筆`)
  phraseLines.slice(0, 15).forEach(l => console.log(`  p${l.page}: ${l.text}`))

  // 3e. 有音標但被目前 parser 跳過的行 (未出現在 vocab.json 中)
  const parsedWords = new Set()
  for (const pg of Object.values(vocab.pages)) {
    for (const w of pg.words) parsedWords.add(w.word.toLowerCase())
  }
  const missed = allLines.filter(l => {
    if (!/\[/.test(l.text)) return false
    const word = l.text.slice(0, l.text.indexOf('[')).trim()
      .replace(/\s*\(\d+\)\s*$/, '').replace(/\d+$/, '').trim()
    if (!word || word.length > 60 || /^\d/.test(word)) return false
    if (/LEVEL|大考|字彙/.test(word)) return false
    return !parsedWords.has(word.toLowerCase())
  })
  console.log(`\n[3e] 有音標但未出現在 vocab.json 的行 (疑似遺漏): ${missed.length} 筆`)
  missed.slice(0, 20).forEach(l => console.log(`  p${l.page}: ${l.text}`))

  // ── 4. above / actor/actress 邊緣格式 ────────────────────────────
  console.log('\n════════════════════════════════════════')
  console.log('§4  邊緣格式舉例 (above 多詞性 / actor/actress 多音標)')
  console.log('════════════════════════════════════════')

  const edgeCases = allLines.filter(l =>
    /above|actor|actress|host|waiter|waitress|fiancé|photograph/i.test(l.text) && /\[/.test(l.text)
  )
  edgeCases.slice(0, 15).forEach(l => console.log(`  p${l.page}: ${l.text}`))

  console.log('\n════ 報告結束 ════\n')
}

main().catch(err => { console.error(err); process.exit(1) })
