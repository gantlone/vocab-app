<script setup>
import { ref } from 'vue'
import { useSpeech } from '@/composables/useSpeech'

const props = defineProps({ word: Object })
defineEmits(['click'])

const { speak } = useSpeech()
const showTooltip = ref(false)
let hideTimer = null

function onMouseenter() {
  clearTimeout(hideTimer)
  showTooltip.value = true
}

function onMouseleave() {
  // 延遲 200ms，防止游標移向 tooltip 按鈕時閃消
  hideTimer = setTimeout(() => { showTooltip.value = false }, 200)
}
</script>

<template>
  <div
    class="word-card"
    @click="$emit('click', word)"
    @mouseenter="onMouseenter"
    @mouseleave="onMouseleave"
  >
    <span class="word-text">{{ word.word }}</span>
    <div v-show="showTooltip" class="tooltip">
      <div class="tooltip-info">
        <span class="pos">{{ word.pos }}</span>
        <span class="meaning">{{ word.meaning }}</span>
      </div>
      <div class="tooltip-speak">
        <button class="ts-btn" @mousedown.stop @click.stop="speak(word.word, 'us')">🇺🇸</button>
        <button class="ts-btn" @mousedown.stop @click.stop="speak(word.word, 'uk')">🇬🇧</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.word-card {
  position: relative;
  padding: 0.6rem 0.9rem;
  background: var(--color-surface);
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
}
.word-card:hover {
  border-color: var(--color-primary);
  box-shadow: 0 2px 8px rgba(74,158,255,0.15);
}
.word-text {
  font-size: 0.95rem;
  font-weight: 500;
}
.tooltip {
  position: absolute;
  bottom: calc(100% + 6px);
  left: 50%;
  transform: translateX(-50%);
  background: #2c3e50;
  color: #fff;
  border-radius: 6px;
  padding: 0.4rem 0.6rem;
  white-space: nowrap;
  font-size: 0.82rem;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.tooltip::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 5px solid transparent;
  border-top-color: #2c3e50;
}
.tooltip-info {
  display: flex;
  gap: 0.4rem;
  align-items: center;
}
.pos {
  opacity: 0.7;
  font-style: italic;
  font-size: 0.75rem;
}
.tooltip-speak {
  display: flex;
  gap: 0.2rem;
}
.ts-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.9rem;
  padding: 0.05rem 0.15rem;
  line-height: 1;
  transition: transform 0.15s;
}
.ts-btn:hover { transform: scale(1.2); }
</style>
