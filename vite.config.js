import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

const allowedHosts = ['.cosmoplat.cn', '.cosmoplat.com', '.cosmoplat.net']

export default defineConfig({
  plugins: [vue()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    allowedHosts
  },
  build: {
    chunkSizeWarningLimit: 1500
  }
})
