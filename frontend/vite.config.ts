import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

<<<<<<< HEAD
const backendTarget = process.env.GREENMIND_API_TARGET || 'http://localhost:8000'
const proxy = {
  '/api': { target: backendTarget, changeOrigin: true },
  '/uploads': { target: backendTarget, changeOrigin: true },
}

=======
// 统一约定：前端 axios baseURL=/api；dev 代理 /api → 后端 http://localhost:8000
>>>>>>> origin/master
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
<<<<<<< HEAD
    proxy,
  },
  preview: { proxy, allowedHosts: ['.trycloudflare.com'] },
})
=======
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks: {
          vue: ['vue', 'vue-router', 'pinia'],
          'element-plus': ['element-plus'],
          echarts: ['echarts/core', 'echarts/charts', 'echarts/components', 'echarts/renderers'],
        },
      },
    },
  },
})
>>>>>>> origin/master
