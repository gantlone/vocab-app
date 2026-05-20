import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import { fileURLToPath } from 'url'
import { memorySaverPlugin } from './vite-plugins/memory-saver.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  base: '/vocab-app/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    watch: {
      // 避免 plugin 寫入這些檔案時觸發 Vite HMR 重載
      ignored: ['**/src/data/memory.json', '**/src/error.log']
    }
  },
  plugins: [vue(), memorySaverPlugin()]
})
