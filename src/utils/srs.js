const ONE_DAY = 24 * 60 * 60 * 1000

const INTERVALS = [
  0,               // level 0: 立刻複習
  1 * ONE_DAY,     // level 1: 1 天
  3 * ONE_DAY,     // level 2: 3 天
  7 * ONE_DAY,     // level 3: 7 天
  14 * ONE_DAY,    // level 4: 14 天(算熟練)
  30 * ONE_DAY,    // level 5: 30 天
]

export function calculateNextReview(level) {
  const interval = INTERVALS[Math.min(level, INTERVALS.length - 1)]
  return Date.now() + interval
}

export function buildPracticeQueue(pageWords, dueWords, totalSize = 10) {
  const dueCount = Math.min(Math.ceil(totalSize * 0.6), dueWords.length)
  const dueIds = new Set(dueWords.map(w => w.id))
  const otherPageWords = pageWords.filter(w => !dueIds.has(w.id))

  const dueShuffled = shuffle(dueWords).slice(0, dueCount)
  const pageShuffled = shuffle(otherPageWords).slice(0, totalSize - dueCount)

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
