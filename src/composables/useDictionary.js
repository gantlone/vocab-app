import { ref } from 'vue'

const sessionCache = {}

export function useDictionary() {
  const loading = ref(false)
  const error = ref(null)

  async function fetchWord(rawWord) {
    const word = rawWord.split('/')[0].replace(/[^a-zA-Z\s'-]/g, '').trim()
    if (!word) return null
    if (sessionCache[word]) return sessionCache[word]

    loading.value = true
    error.value = null
    try {
      const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`)
      if (!res.ok) throw new Error(`${res.status}`)
      const data = await res.json()
      const result = parseEntry(data[0])
      sessionCache[word] = result
      return result
    } catch (e) {
      error.value = e.message
      return null
    } finally {
      loading.value = false
    }
  }

  function parseEntry(entry) {
    if (!entry) return null

    const phonetics = {
      us: entry.phonetics?.find(p => p.audio?.includes('-us.'))?.audio
        ?? entry.phonetics?.find(p => p.audio)?.audio
        ?? null,
      uk: entry.phonetics?.find(p => p.audio?.includes('-uk.'))?.audio ?? null,
      text: entry.phonetic ?? entry.phonetics?.find(p => p.text)?.text ?? null,
    }

    const all = []
    for (const meaning of entry.meanings ?? []) {
      for (const def of meaning.definitions ?? []) {
        if (def.example) all.push(def.example)
      }
    }
    // 優先短句（字數 < 15），不足再補長句，最多 3 句
    const short = all.filter(s => s.split(' ').length < 15)
    const long  = all.filter(s => s.split(' ').length >= 15)
    const examples = [...short, ...long].slice(0, 3)

    return { phonetics, examples }
  }

  return { fetchWord, loading, error }
}
