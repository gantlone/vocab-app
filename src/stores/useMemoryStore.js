import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import memoryData from '@/data/memory.json'
import { calculateNextReview } from '@/utils/srs'

const STORAGE_KEY = 'vocab-memory-v1'

export const useMemoryStore = defineStore('memory', () => {
  const records = ref(loadInitial())

  function loadInitial() {
    try {
      const local = localStorage.getItem(STORAGE_KEY)
      if (local) {
        const parsed = JSON.parse(local)
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

  let fileSyncTimer = null
  watch(records, (val) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(val))
    } catch (e) {
      console.warn('localStorage write failed', e)
    }

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
