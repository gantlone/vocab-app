import { ref } from 'vue'

const audioCache = {}
const isPlaying = ref(false)

export function useSpeech() {
  // 直接走 Web Speech，用於句子或指定腔調的單字發音
  function speakText(text, accent) {
    if (!window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const utt = new SpeechSynthesisUtterance(text)
    utt.lang = accent === 'uk' ? 'en-GB' : 'en-US'
    utt.rate = 0.85
    utt.onend  = () => { isPlaying.value = false }
    utt.onerror = () => { isPlaying.value = false }
    isPlaying.value = true
    window.speechSynthesis.speak(utt)
  }

  // 優先用 Dictionary API mp3，失敗再 fallback Web Speech
  // audioUrlOrAccent 可傳 mp3 URL、'us'、'uk' 或 undefined
  async function speak(word, audioUrlOrAccent) {
    window.speechSynthesis?.cancel()

    const isAccent = audioUrlOrAccent === 'us' || audioUrlOrAccent === 'uk'

    if (!isAccent && audioUrlOrAccent) {
      try {
        if (!audioCache[audioUrlOrAccent]) {
          audioCache[audioUrlOrAccent] = new Audio(audioUrlOrAccent)
        }
        const audio = audioCache[audioUrlOrAccent]
        audio.currentTime = 0
        audio.onended = () => { isPlaying.value = false }
        audio.onerror = () => { isPlaying.value = false }
        isPlaying.value = true
        await audio.play()
        return
      } catch {}
    }

    if (window.speechSynthesis) {
      const utt = new SpeechSynthesisUtterance(word)
      utt.lang = audioUrlOrAccent === 'uk' ? 'en-GB' : 'en-US'
      utt.onend  = () => { isPlaying.value = false }
      utt.onerror = () => { isPlaying.value = false }
      isPlaying.value = true
      window.speechSynthesis.speak(utt)
    }
  }

  return { speak, speakText, isPlaying }
}
