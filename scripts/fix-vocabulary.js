import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const VOCAB_PATH = path.resolve(__dirname, '../src/data/vocabulary.json')

// POS markers that incorrectly appear at the start of meaning fields
const LEADING_POS_RE = /^(?:\/\s*)?(?:\[[^\]]*\]\s*)?(?:(?:adv|vi|vt|adj|prep|conj|pron|art|aux|int|phr|v|n)\.\s*)+/i

// Known manual fixes: entries where meaning becomes empty after stripping
// These are words where the PDF layout had two phonetics on same line
const MANUAL_FIXES = {
  'p1_w9':    { pos: 'n.',       meaning: '男演員/女演員' },  // actor/actress — meaning was second phonetic
  'p7_w627':  { pos: 'vt./vi.',  meaning: '支付；值得' },     // pay (1) (ment) — meaning was just "vi. n."
  'p75_w6362':{ pos: 'adv./adj.',meaning: '任何的；無論如何' }, // whatsoever — meaning was just "adv.adj."
}

function fixMeaning(meaning) {
  let m = meaning
  let prev
  do {
    prev = m
    m = m.replace(LEADING_POS_RE, '').trim()
  } while (m !== prev)
  return m
}

async function run() {
  const raw = await fs.readFile(VOCAB_PATH, 'utf-8')
  const vocab = JSON.parse(raw)

  let fixed = 0
  let emptied = 0
  let manualFixed = 0

  for (const page of Object.values(vocab.pages)) {
    for (const word of page.words) {
      const manual = MANUAL_FIXES[word.id]
      if (manual) {
        word.pos = manual.pos
        word.meaning = manual.meaning
        manualFixed++
        continue
      }

      const original = word.meaning
      const cleaned = fixMeaning(original)

      if (cleaned !== original) {
        if (cleaned === '') {
          // meaning became empty — log for manual review, keep original
          console.warn(`[WARN] meaning became empty after fix — keeping original: ${word.id} "${word.word}" | was: "${original}"`)
          emptied++
        } else {
          word.meaning = cleaned
          fixed++
        }
      }
    }
  }

  await fs.writeFile(VOCAB_PATH, JSON.stringify(vocab, null, 2), 'utf-8')

  console.log(`\nDone!`)
  console.log(`  Fixed (POS stripped from meaning): ${fixed}`)
  console.log(`  Manual fixes applied: ${manualFixed}`)
  console.log(`  Skipped (meaning would become empty): ${emptied}`)
}

run().catch(err => {
  console.error(err)
  process.exit(1)
})
