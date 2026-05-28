import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const VOCAB_PATH = path.resolve(__dirname, '../src/data/vocabulary.json')

// Strip leading POS markers like "adv.", "vi./n.", etc.
const LEADING_POS_RE = /^(?:\/\s*)?(?:\[[^\]]*\]\s*)?(?:(?:adv|vi|vt|adj|prep|conj|pron|art|aux|int|phr|v|n)\.\s*)+/i

// Strip leading grammar annotations like [U], [C], [複], [單]
const LEADING_GRAMMAR_RE = /^\[(?:U|C|U\/C|C\/U|複|單|可數|不可數)\]\s*/

// Strip leading phonetic notation like [ˋkɑnflɪkt] (contains IPA stress marks)
const LEADING_PHONETIC_RE = /^\[[^\]]*[ˋˊ̀-ͯ][^\]]*\]\s*/

// IDs to delete entirely (garbled PDF parse fragments)
const DELETE_IDS = new Set([
  'p40_w3500',  // fragment of "drill" meaning split across lines
  'p40_w3501',  // fragment of "drill" meaning
  'p46_w3947',  // fragment of "philosophy" meaning ("主義")
  'p48_w4074',  // fragment of "revenge" meaning ("n.報仇；報復")
])

// Manual fixes: override word / pos / meaning for specific entries
const MANUAL_FIXES = {
  'p1_w9':    { pos: 'n.',       meaning: '男演員/女演員' },          // actor/actress
  'p7_w627':  { pos: 'vt./vi.',  meaning: '支付；值得' },             // pay
  'p13_w1201':{ word: 'conflict',pos: 'vi./n.', meaning: '衝突' },   // word had "vi." appended
  'p13_w1205':{ word: 'contact', pos: 'vt./n.', meaning: '接觸' },   // word had "vt." appended
  'p23_w2125':{ pos: 'n.',       meaning: '細菌' },                    // bacterium — meaning was "[單]"
  'p40_w3499':{ meaning: '鑽(孔)；在…上鑽孔；n.鑽，鑽頭；操練；訓練' }, // drill — merge split lines
  'p46_w3946':{ meaning: '哲學；人生觀；主義' },                       // philosophy — merge split line
  'p48_w4073':{ meaning: '替…報仇；n.報仇；報復' },                    // revenge — merge split line
  'p75_w6362':{ pos: 'adv./adj.',meaning: '任何的；無論如何' },        // whatsoever
}

function fixMeaning(meaning) {
  let m = meaning
  let prev
  do {
    prev = m
    m = m.replace(LEADING_POS_RE, '').trim()
    m = m.replace(LEADING_GRAMMAR_RE, '').trim()
    m = m.replace(LEADING_PHONETIC_RE, '').trim()
  } while (m !== prev)
  return m
}

async function run() {
  const raw = await fs.readFile(VOCAB_PATH, 'utf-8')
  const vocab = JSON.parse(raw)

  let fixed = 0
  let deleted = 0
  let manualFixed = 0
  let emptied = 0

  for (const [pageKey, page] of Object.entries(vocab.pages)) {
    // Filter out deleted entries
    const before = page.words.length
    page.words = page.words.filter(w => {
      if (DELETE_IDS.has(w.id)) { deleted++; return false }
      return true
    })
    if (page.words.length !== before) {
      // Update page word count isn't tracked in metadata per-entry, no action needed
    }

    for (const word of page.words) {
      const manual = MANUAL_FIXES[word.id]
      if (manual) {
        if (manual.word    !== undefined) word.word    = manual.word
        if (manual.pos     !== undefined) word.pos     = manual.pos
        if (manual.meaning !== undefined) word.meaning = manual.meaning
        manualFixed++
        continue
      }

      const original = word.meaning
      const cleaned = fixMeaning(original)

      if (cleaned !== original) {
        if (cleaned === '') {
          console.warn(`[WARN] meaning became empty — keeping original: ${word.id} "${word.word}" | was: "${original}"`)
          emptied++
        } else {
          word.meaning = cleaned
          fixed++
        }
      }
    }
  }

  // Recalculate totalWords after deletions
  vocab.metadata.totalWords = Object.values(vocab.pages).reduce((sum, p) => sum + p.words.length, 0)

  await fs.writeFile(VOCAB_PATH, JSON.stringify(vocab, null, 2), 'utf-8')

  console.log(`\nDone!`)
  console.log(`  Auto-fixed (stripped leading POS/grammar/phonetic): ${fixed}`)
  console.log(`  Manual fixes applied: ${manualFixed}`)
  console.log(`  Deleted (garbled fragments): ${deleted}`)
  console.log(`  Skipped (would become empty): ${emptied}`)
}

run().catch(err => {
  console.error(err)
  process.exit(1)
})
