<script setup>
import { ref } from 'vue'
import PageSelector from './PageSelector.vue'
import WordGrid from './WordGrid.vue'
import WordDetail from './WordDetail.vue'

const selectedPage = ref(1)
const selectedWord = ref(null)
</script>

<template>
  <div class="learning-tab">
    <template v-if="!selectedWord">
      <PageSelector v-model="selectedPage" />
      <WordGrid :page="selectedPage" @word-click="selectedWord = $event" />
    </template>
    <WordDetail v-else :word="selectedWord" @back="selectedWord = null" />
  </div>
</template>
