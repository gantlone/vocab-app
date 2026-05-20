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
    const shuffled = [...candidates].sort(() => Math.random() - 0.5)
    return shuffled.slice(0, count)
  }

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
